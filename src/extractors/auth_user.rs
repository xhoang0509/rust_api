use crate::auth::verify_token;
use crate::AppState;
use axum::{
    extract::FromRequestParts,
    http::{header, request::Parts, StatusCode},
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthUser {
    pub id: i64,
    pub email: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = (StatusCode, String);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|val| val.to_str().ok());

        let token = match auth_header {
            Some(header_val)
                if header_val
                    .get(..7)
                    .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer ")) =>
            {
                let trimmed = header_val[7..].trim();
                if trimmed.is_empty() {
                    return Err((StatusCode::UNAUTHORIZED, "Unauthorized".to_string()));
                }
                trimmed
            }
            _ => return Err((StatusCode::UNAUTHORIZED, "Unauthorized".to_string())),
        };

        let claims = verify_token(token, &state.jwt_secret)
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()))?;

        let user_id: i64 = claims
            .sub
            .parse()
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()))?;

        Ok(AuthUser {
            id: user_id,
            email: claims.email,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OptionalAuthUser(pub Option<AuthUser>);

impl FromRequestParts<AppState> for OptionalAuthUser {
    type Rejection = (StatusCode, String);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|val| val.to_str().ok());

        let header_val = match auth_header {
            Some(v) => v,
            None => return Ok(OptionalAuthUser(None)),
        };

        if !header_val
            .get(..7)
            .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer "))
        {
            return Ok(OptionalAuthUser(None));
        }

        let token = header_val[7..].trim();
        if token.is_empty() {
            return Ok(OptionalAuthUser(None));
        }

        match verify_token(token, &state.jwt_secret) {
            Ok(claims) => match claims.sub.parse::<i64>() {
                Ok(user_id) => Ok(OptionalAuthUser(Some(AuthUser {
                    id: user_id,
                    email: claims.email,
                }))),
                Err(_) => Ok(OptionalAuthUser(None)),
            },
            Err(_) => Ok(OptionalAuthUser(None)),
        }
    }
}
