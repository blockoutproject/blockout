package com.blockout.mobilegateway.models.dto.http;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class HttpAction {
    public enum Method { GET, POST }
    public enum Encoding { URLENCODED, MULTIPART }

    private Method method;
    private Encoding encoding;
    private String url;

    @JsonProperty("params")
    private List<NameValue> params;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class NameValue {
        private String name;
        private String value;

        public NameValue() {}
        public NameValue(String name, String value) { this.name = name; this.value = value; }
        public String getName() { return name; }
        public String getValue() { return value; }
        public void setName(String n) { this.name = n; }
        public void setValue(String v) { this.value = v; }
    }

    public HttpAction() {}
    public HttpAction(Method method, Encoding encoding, String url, List<NameValue> params) {
        this.method = method; this.encoding = encoding; this.url = url; this.params = params;
    }
    public Method getMethod() { return method; }
    public Encoding getEncoding() { return encoding; }
    public String getUrl() { return url; }
    public List<NameValue> getParams() { return params; }
    public void setMethod(Method m) { this.method = m; }
    public void setEncoding(Encoding e) { this.encoding = e; }
    public void setUrl(String u) { this.url = u; }
    public void setParams(List<NameValue> p) { this.params = p; }
}