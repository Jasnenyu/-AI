mod adapter;
mod models;
mod registry;

use reqwest::Client;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{
    AIProvider, GenerateRequest, ProviderTaskHandle, ProviderTaskPollResult, ProviderTaskSubmission,
};

use registry::PPIOModelRegistry;

pub struct PPIOProvider {
    client: Client,
    api_key: Arc<RwLock<Option<String>>>,
    base_url: String,
    model_registry: PPIOModelRegistry,
}

#[derive(Debug, Deserialize)]
struct ImageResponse {
    image_urls: Vec<String>,
}

impl PPIOProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: Arc::new(RwLock::new(None)),
            base_url: "https://api.ppio.com".to_string(),
            model_registry: PPIOModelRegistry::new(),
        }
    }

    pub async fn set_api_key(&self, api_key: String) {
        let mut key = self.api_key.write().await;
        *key = Some(api_key);
    }

    pub async fn get_api_key(&self) -> Option<String> {
        let key = self.api_key.read().await;
        key.clone()
    }

    async fn generate_internal(&self, request: GenerateRequest) -> Result<String, AIError> {
        let key = self.api_key.read().await;
        let api_key = key
            .as_ref()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let adapter = self
            .model_registry
            .resolve(&request.model)
            .ok_or_else(|| AIError::ModelNotSupported(request.model.clone()))?;

        let prepared = adapter.build_request(&request, &self.base_url)?;

        info!("[PPIO Request] {}", prepared.summary);
        info!("[PPIO API] URL: {}", prepared.endpoint);

        let response = self
            .client
            .post(&prepared.endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&prepared.body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AIError::Provider(format!(
                "API error {}: {}",
                status, error_text
            )));
        }

        let result: ImageResponse = response.json().await?;

        if let Some(image_url) = result.image_urls.first() {
            info!("Generated image: {}", image_url);
            Ok(image_url.clone())
        } else {
            Err(AIError::Provider("No image URL in response".to_string()))
        }
    }
}

impl Default for PPIOProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl AIProvider for PPIOProvider {
    fn name(&self) -> &str {
        "ppio"
    }

    fn supports_model(&self, model: &str) -> bool {
        self.model_registry.supports(model)
    }

    fn list_models(&self) -> Vec<String> {
        self.model_registry.list_models()
    }

    async fn set_api_key(&self, api_key: String) -> Result<(), AIError> {
        PPIOProvider::set_api_key(self, api_key).await;
        Ok(())
    }

    fn supports_task_resume(&self) -> bool {
        // PPIO API 是同步的，但我们模拟异步任务以获得更好的 UX
        true
    }

    async fn submit_task(&self, request: GenerateRequest) -> Result<ProviderTaskSubmission, AIError> {
        // PPIO 是同步 API，我们直接执行并返回结果
        // 这样前端可以立即知道任务完成
        match self.generate_internal(request).await {
            Ok(image_url) => Ok(ProviderTaskSubmission::Succeeded(image_url)),
            Err(error) => Err(error),
        }
    }

    async fn poll_task(&self, _handle: ProviderTaskHandle) -> Result<ProviderTaskPollResult, AIError> {
        // PPIO 是同步 API，不需要轮询
        // 这个方法不应该被调用，因为 submit_task 直接返回 Succeeded
        Ok(ProviderTaskPollResult::Failed("PPIO does not support task polling".to_string()))
    }

    async fn generate(&self, request: GenerateRequest) -> Result<String, AIError> {
        self.generate_internal(request).await
    }
}
