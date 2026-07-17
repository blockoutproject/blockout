package com.blockout.users.account.api.v2;

import com.blockout.users.account.application.UpdateUserProfileCommand;
import com.blockout.users.account.application.UserAccountView;
import com.blockout.users.account.application.UserProfileImageChange;
import com.blockout.users.generated.model.UpdateUserProfileInternalRequest;
import com.blockout.users.generated.model.UserAccountInternalResponse;
import com.blockout.users.shared.mapping.UsersMapperConfig;
import java.net.URI;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps generated account transports to application-owned commands and views. */
@Mapper(config = UsersMapperConfig.class)
public interface UserAccountApiMapper {

    /** Combines generated profile fields with explicit image intent. */
    @Mapping(target = "imageChange", source = "imageChange")
    UpdateUserProfileCommand toCommand(
            UpdateUserProfileInternalRequest request,
            UserProfileImageChange imageChange);

    /** Maps the account application view to the canonical generated response. */
    UserAccountInternalResponse toResponse(UserAccountView view);

    /** Converts a nullable stored URL to the generated URI shape. */
    default URI toUri(String value) {
        return value == null ? null : URI.create(value);
    }
}
