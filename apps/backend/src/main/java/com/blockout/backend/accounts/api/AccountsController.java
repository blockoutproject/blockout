package com.blockout.backend.accounts.api;

import com.blockout.backend.accounts.application.AccountContext;
import com.blockout.backend.accounts.application.ChangeAccountProfile;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.accounts.application.EstablishAccount;
import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.ReadAccount;
import com.blockout.backend.generated.mobile.api.AccountsApi;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import com.blockout.backend.generated.mobile.model.ChangeAccountProfileRequest;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Generated account adapter; validated credentials supply identity, never request fields. */
@RestController
@RequiredArgsConstructor
public class AccountsController implements AccountsApi {
  private final EstablishAccount establishment;
  private final EraseAccount erasure;
  private final ReadAccount reads;
  private final ChangeAccountProfile changes;
  private final AccountApiMapper mapper;
  private final AccountRequest request;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> establishAccount(Boolean bypass) {
    AccountContext context = request.ordinary();
    EstablishAccount.Outcome outcome = establishment.establish(context);
    ReadAccount.View view = outcome.view();
    ResponseEntity.BodyBuilder response =
        outcome.created()
            ? ResponseEntity.created(URI.create("/accounts/" + view.account().id()))
            : ResponseEntity.ok();
    return response
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(view.account(), view.hasPhoto(), view.permissions()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> getMyAccount() {
    AccountContext context = request.current();
    return response(false, reads.current(context.issuer(), context.subject()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> getAccount(UUID id, Boolean bypass) {
    AccountContext context = request.original(id);
    return response(true, reads.original(context.issuer(), context.subject(), id));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> changeAccountProfile(
      UUID id, ChangeAccountProfileRequest metadata, Boolean bypass, MultipartFile image) {
    AccountContext context = request.original(id);
    ProfilePhoto photo = request.profilePhoto(metadata.getPhotoAction(), image);
    return response(
        true,
        changes.change(
            context.issuer(),
            context.subject(),
            id,
            metadata.getUsername(),
            metadata.getPhotoAction(),
            photo));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Void> eraseAccount(UUID id, Boolean bypass) {
    AccountContext context = request.original(id);
    erasure.erase(context.issuer(), context.subject(), id);
    return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Resource> getAccountPhoto(UUID id, Boolean bypass) {
    AccountContext context = request.original(id);
    ProfilePhoto photo = reads.photo(context.issuer(), context.subject(), id);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .contentType(MediaType.parseMediaType(photo.mediaType()))
        .contentLength(photo.bytes().length)
        .body(new ByteArrayResource(photo.bytes()));
  }

  /**
   * Maps current local values into the single generated response representation.
   *
   * @param original whether this is the original resource supporting multipart PATCH
   * @param view owner-authorized read result
   * @return private non-cacheable profile
   */
  private ResponseEntity<AccountResponse> response(boolean original, ReadAccount.View view) {
    ResponseEntity.BodyBuilder response = ResponseEntity.ok().cacheControl(CacheControl.noStore());
    if (original) response.header("Accept-Patch", "multipart/form-data");
    return response.body(mapper.toDto(view.account(), view.hasPhoto(), view.permissions()));
  }
}
