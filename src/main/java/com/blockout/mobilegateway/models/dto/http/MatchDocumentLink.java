package com.blockout.mobilegateway.models.dto.http;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class MatchDocumentLink {
    private String id;
    private String title;
    private HttpAction action;

    public MatchDocumentLink() {}
    public MatchDocumentLink(String id, String title, HttpAction action) {
        this.id = id; this.title = title; this.action = action;
    }
    public String getId() { return id; }
    public String getTitle() { return title; }
    public HttpAction getAction() { return action; }
    public void setId(String id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setAction(HttpAction action) { this.action = action; }
}