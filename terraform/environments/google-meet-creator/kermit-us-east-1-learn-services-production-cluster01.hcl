include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../services/interactive-video-service"
}

inputs = {
  region = "us-east-1"
  domain_name_suffix = "prod-kermit-us-east-1"
  min_replicas = 4
  max_replicas = 20
  ingress_class = "blackboard-com-public"
  frontend_url = "https://google-meet.blackboard.com"
  server_port = "3000"
  app_key = "833b49e3-2a3b-47ca-ae7a-ce5639c49ff8"
  app_secret = "VRhADL91fGEQUuTRjjWLLkckmbmNCaeZ"
  bb_client_id = "da888d42-1b3c-4c90-9a26-cc3bb5e202c4"
  ms_client_id = ""
  issuer = "https://blackboard.com"
  jwks_url = "https://developer.blackboard.com/api/v1/management/applications/da888d42-1b3c-4c90-9a26-cc3bb5e202c4/jwks.json"
  oauth_token_url = "https://developer.blackboard.com/api/v1/gateway/oauth2/jwttoken"
  oidc_auth_url = "https://developer.blackboard.com/api/v1/gateway/oidcauth"
}