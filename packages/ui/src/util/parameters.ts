export class parameters {
  private static instance: parameters;
  _courseName: string | undefined;
  _nonce: string | undefined;
  _returnUrl: string | undefined;
  private _streamUrl: string | undefined;

  private constructor() {
  }

  public static getInstance(): parameters {
    if (!parameters.instance) {
      parameters.instance = new parameters();
    }

    return parameters.instance;
  }

  public getCourseName() {
    return this._courseName;
  }

  public setCourseName(name: string | undefined) {
    this._courseName = name;
  }

  public getNonce() {
    return this._nonce;
  }

  public setNonce(nonce: string | undefined) {
    this._nonce = nonce;
  }

  public getReturnUrl() {
    return this._returnUrl;
  }

  public setReturnUrl(url: string | undefined) {
    this._returnUrl = url;
  }

  public getStreamUrl(): string | undefined {
    return this._streamUrl;
  }

  public setStreamUrl(value: string | undefined) {
    this._streamUrl = value;
  }
}
