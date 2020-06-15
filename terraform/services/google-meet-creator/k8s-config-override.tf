data "kubernetes_secret" "google_meet_creator" {
  metadata {
    name = "learn-svc-google-meet-creator-terraform"
    namespace = var.k8s_namespace
  }
}

resource "kubernetes_config_map" "google_meet_creator" {
  metadata {
    name = "learn-svc-google-meet-creator"
    namespace = var.k8s_namespace
  }
  data = {
    "config.json" = local.configMapContents
  }
}