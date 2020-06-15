include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../services/google-meet-creator"
}

inputs = {
  region = "us-east-1"
  domain_name_suffix = "playground-fozzie-us-east-1"
  min_replicas = 1
  max_replicas = 1
  frontend_url = "https://google-meet-playground-us-east-1.saas.bbpd.io/"
  server_port = "3000"
  app_key = "0de0aa4d-65b4-406e-9010-ee9229ea1cd8"
  app_secret = "IYwFdRLEmrgUAXQiTkkHYdsfKsxuEXbT"
  bb_client_id = "675de6fc-ccd1-497c-958b-cc72e60d098d"
  ms_client_id = ""
  issuer = "https://blackboard.com"
  jwks_url = "https://developer.blackboard.com/api/v1/management/applications/675de6fc-ccd1-497c-958b-cc72e60d098d/jwks.json"
  oauth_token_url = "https://developer.blackboard.com/api/v1/gateway/oauth2/jwttoken"
  oidc_auth_url = "https://developer.blackboard.com/api/v1/gateway/oidcauth"
}