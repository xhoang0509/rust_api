#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub host: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8080);

        Self { host, port }
    }

    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    #[test]
    fn test_config_defaults() {
        let _lock = ENV_MUTEX.lock().unwrap();
        // Ensure without env variables set, defaults are 0.0.0.0:8080
        std::env::remove_var("HOST");
        std::env::remove_var("PORT");
        let config = Config::from_env();
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
        assert_eq!(config.address(), "0.0.0.0:8080");
    }

    #[test]
    fn test_config_from_env() {
        let _lock = ENV_MUTEX.lock().unwrap();
        std::env::set_var("HOST", "127.0.0.1");
        std::env::set_var("PORT", "3000");
        let config = Config::from_env();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 3000);
        assert_eq!(config.address(), "127.0.0.1:3000");
        // Clean up
        std::env::remove_var("HOST");
        std::env::remove_var("PORT");
    }
}
