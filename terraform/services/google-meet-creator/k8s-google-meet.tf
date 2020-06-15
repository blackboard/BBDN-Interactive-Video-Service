resource "kubernetes_deployment" "google_meet_creator" {
  timeouts {
    create = "5m"
    update = "2m"
  }

  metadata {
    name      = "learn-svc-interactive-video-service"
    namespace = var.k8s_namespace

    labels = local.serviceLabels
  }

  spec {
    replicas = var.min_replicas

    strategy {
      rolling_update {
        max_surge       = 2
        max_unavailable = 0
      }
    }

    selector {
      match_labels = local.serviceSelector
    }

    template {
      metadata {
        name      = "learn-svc-interactive-video-service"
        namespace = var.k8s_namespace
        labels    = local.serviceLabels
        annotations = {
          config_hash = "${sha256(local.configMapContents)}"
        }
      }

      spec {
        volume {
          name = "config"
          config_map {
            name = "learn-svc-interactive-video-service"
            items {
              key = "config.json"
              path = "config.json"
            }
          }
        }

        container {
          name  = "service"
          image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/learn-svc/interactive-video-service:${var.image_tag}"

          security_context {
            allow_privilege_escalation = false
            run_as_non_root = true
            run_as_user = 1000
            run_as_group = 1000
          }

          volume_mount {
            mount_path = "/usr/app/packages/server/config/config_override.json"
            name = "config"
            sub_path = "config.json"
          }

          port {
            container_port = 3000
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 3000
            }

            initial_delay_seconds = 60
            period_seconds        = 60
            timeout_seconds       = 30
          }

          resources {
            requests {
              cpu    = "0.5"
              memory = "128Mi"
            }

            limits {
              cpu    = "1"
              memory = "1Gi"
            }
          }

          env {
            name = "NEW_RELIC_LICENSE_KEY"
            value_from {
              secret_key_ref {
                name = "new-relic"
                key = "NEW_RELIC_KEY"
              }
            }
          }

          env {
            name = "NEW_RELIC_APP_NAME"
            value = "interactive-video-service-${var.url_suffix}"
          }

          env {
            name = "NEW_RELIC_ENABLED"
            value = var.newrelic_enabled
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "google_meet_creator" {
  metadata {
    name      = "learn-svc-interactive-video-service"
    namespace = var.k8s_namespace
    labels    = local.serviceLabels
  }

  spec {
    port {
      port = 3000
      name = "http"
    }

    selector = local.serviceSelector
  }
}

resource "kubernetes_ingress" "google_meet_creator" {
  metadata {
    name      = "learn-svc-interactive-video-service"
    namespace = var.k8s_namespace

    annotations = {
      "kubernetes.io/ingress.class" = var.ingress_class
      "nginx.ingress.kubernetes.io/ssl-redirect" = "true"
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
      "external-dns.alpha.kubernetes.io/hostname" = "google-meet-${var.url_suffix}.saas.bbpd.io"
    }
  }

  spec {
    rule {
      host = "google-meet-${var.url_suffix}.saas.bbpd.io"

      http {
        path {
          path = "/"
          backend {
            service_name = kubernetes_service.google_meet_creator.metadata[0].name
            service_port = kubernetes_service.google_meet_creator.spec[0].port[0].port
          }
        }
      }
    }
    rule {
      host = "google-meet.blackboard.com"

      http {
        path {
          path = "/"
          backend {
            service_name = kubernetes_service.google_meet_creator.metadata[0].name
            service_port = kubernetes_service.google_meet_creator.spec[0].port[0].port
          }
        }
      }
    }
  }
}
