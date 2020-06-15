resource "kubernetes_horizontal_pod_autoscaler" "msteams_app_lms_meetings" {
  metadata {
    name      = "learn-svc-interactive-video-service"
    namespace = var.k8s_namespace
    labels    = local.serviceLabels
  }
  spec {
    max_replicas                      = var.max_replicas
    min_replicas                      = var.min_replicas
    target_cpu_utilization_percentage = 70

    scale_target_ref {
      kind = "Deployment"
      name = kubernetes_deployment.google_meet_creator.metadata[0].name
    }
  }
}