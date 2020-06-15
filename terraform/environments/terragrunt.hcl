remote_state {
  backend = "s3"
  config = {
    bucket         = get_env("STATE_BUCKET", "")
    key            = get_env("STATE_KEY", "")
    region         = get_env("STATE_REGION", "")
    encrypt        = true
  }
}
