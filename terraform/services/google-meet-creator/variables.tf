variable "region" {}
variable "fleet" {
  description = "The fleetId for the given fleet"
}
variable "kubernetes_config_context_cluster" {}
variable "k8s_namespace" {}
variable "min_replicas" {}
variable "max_replicas" {}
variable "image_tag" {}

variable "newrelic_enabled" {
  default = false
}

variable "url_suffix" {}
variable "ingress_class" {
  default = "saas-bbpd-io-public"
}
variable "environment" {}

variable "frontend_url" {}
variable "server_port" {}
variable "app_key" {}
variable "app_secret" {}
variable "bb_client_id" {}
variable "ms_client_id" {}
variable "issuer" {}
variable "jwks_url" {}
variable "oauth_token_url" {}
variable "oidc_auth_url" {}