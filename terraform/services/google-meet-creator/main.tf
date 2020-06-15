terraform {
  backend "s3" {}
}

provider "aws" {
  version = "~> 2.18"
  region  = var.region
}

provider "random" {
  version = "~> 2.1"
}

provider "kubernetes" {
  version                = "~> 1.8"
  config_context_cluster = var.kubernetes_config_context_cluster
}

data "aws_caller_identity" "current" {}

locals {
  serviceLabels = {
    app = "interactive-video-service"
    Environment = var.environment
    Product = "lic"
    Component = "learnsaas-aux"
    LayerDetail = "interactive-video-service"
    Chargeback = "base"
    ClientId = "shared"
    "prometheus.io/probe" = "false"
    "com.blackboard.infra/slack-channel" = "pd-service-alerts"
    "com.blackboard.infra/pagerduty-route" = "google-meet-app"
  }

  serviceSelector = {
    app = "interactive-video-service"
    Environment = var.environment
  }

  configMapContents = <<EOT
{
  "frontendUrl": "${var.frontend_url}",
  "serverPort": "${var.server_port}",
  "appKey": "${var.app_key}",
  "appSecret": "${var.app_secret}",
  "bbClientId": "${var.bb_client_id}",
  "msClientId": "${var.ms_client_id}",
  "issuer": "${var.issuer}",
  "jwksUrl": "${var.jwks_url}",
  "oauthTokenUrl": "${var.oauth_token_url}",
  "oidcAuthUrl": "${var.oidc_auth_url}",
  "redis_host": "${data.kubernetes_secret.google_meet_creator.data.REDIS_HOST}",
  "redis_port": ${data.kubernetes_secret.google_meet_creator.data.REDIS_PORT}
}
EOT
}

// We need to be assured this secret exists
data "kubernetes_secret" "newrelic" {
  metadata {
    name = "new-relic"
    namespace = var.k8s_namespace
  }
}