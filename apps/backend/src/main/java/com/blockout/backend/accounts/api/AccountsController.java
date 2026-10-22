package com.blockout.backend.accounts.api;

import com.blockout.backend.accounts.application.AccountAdmission;
import com.blockout.backend.accounts.application.EstablishAccount;
import com.blockout.backend.accounts.application.ReadAccount;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.generated.mobile.api.AccountsApi;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import com.blockout.backend.generated.mobile.model.ChangeAccountProfileRequest;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Generated account adapter; validated credentials supply identity, never request fields. */
@RestController
@RequiredArgsConstructor
public class AccountsController implements AccountsApi {
  private final EstablishAccount establishment;
  private final ReadAccount reads;
  private final AccountApiMapper mapper;
  private final ObjectProvider<AccountAdmission> admission;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> establishAccount(Boolean bypass) {
    requireOrdinaryAccess(bypass);
    JwtAuthenticationToken principal = principal();
    EstablishAccount.Outcome outcome =
        establishment.establish(
            principal.getToken().getIssuer().toString(), principal.getToken().getSubject());
    ReadAccount.View view;
    try {
      view =
          reads.original(
              principal.getToken().getIssuer().toString(),
              principal.getToken().getSubject(),
              outcome.account().id());
    } catch (AccountNotFoundException absent) {
      throw new AccountUnavailableException();
    }
    ResponseEntity.BodyBuilder response =
        outcome.created()
            ? ResponseEntity.created(URI.create("/accounts/" + outcome.account().id()))
            : ResponseEntity.ok();
    return response
        .header("Cache-Control", "no-store")
        .body(mapper.toDto(view.account(), view.hasPhoto(), view.permissions()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> getMyAccount() {
    JwtAuthenticationToken principal = principal();
    return response(
        false,
        reads.current(
            principal.getToken().getIssuer().toString(), principal.getToken().getSubject()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> getAccount(UUID id, Boolean bypass) {
    requireOrdinaryAccess(bypass);
    JwtAuthenticationToken principal = principal();
    return response(
        true,
        reads.original(
            principal.getToken().getIssuer().toString(), principal.getToken().getSubject(), id));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> changeAccountProfile(
      UUID id, ChangeAccountProfileRequest metadata, Boolean bypass, MultipartFile image) {
    requireOrdinaryAccess(bypass);
    throw new AccountUnavailableException();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Void> eraseAccount(UUID id, Boolean bypass) {
    requireOrdinaryAccess(bypass);
    throw new AccountUnavailableException();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Resource> getAccountPhoto(UUID id, Boolean bypass) {
    requireOrdinaryAccess(bypass);
    throw new AccountUnavailableException();
  }

  /**
   * Fails closed until F12 installs its real policy; only current-account identification skips it.
   *
   * @param bypass explicit personal intent forwarded unchanged to the policy owner
   */
  private void requireOrdinaryAccess(Boolean bypass) {
    AccountAdmission policy = admission.getIfAvailable();
    if (policy == null) throw new AccountUnavailableException();
    policy.requireOrdinaryAccess(Boolean.TRUE.equals(bypass));
  }

  /** Returns the JWT already validated and client-authorized by the resource-server filter. */
  private JwtAuthenticationToken principal() {
    return (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
  }

  /**
   * Maps current local values into the single generated response representation.
   *
   * @param original whether this is the original resource supporting multipart PATCH
   * @param view owner-authorized read result
   * @return private non-cacheable profile
   */
  private ResponseEntity<AccountResponse> response(boolean original, ReadAccount.View view) {
    ResponseEntity.BodyBuilder response = ResponseEntity.ok().header("Cache-Control", "no-store");
    if (original) response.header("Accept-Patch", "multipart/form-data");
    return response.body(mapper.toDto(view.account(), view.hasPhoto(), view.permissions()));
  }
}
