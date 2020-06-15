include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../services/google-meet-creator"
}

//TODO: if we need to deploy to animal (staging) we need configs for that and a developer.blackboard.com app registered
inputs = {
  region = "us-east-1"
  domain_name_suffix = "ci-animal-us-east-1"
  min_replicas = 1
  max_replicas = 1
  ingress_class = "saas-bbpd-io-private"
  frontend_url = ""
  server_port = ""
  app_key = ""
  app_secret = ""
  bb_client_id = ""
  ms_client_id = ""
  issuer = ""
  jwks_url = ""
  oauth_token_url = ""
  oidc_auth_url = ""
}