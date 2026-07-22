package com.blockout.notifications.notification.api.mappers;

import com.blockout.notifications.notification.api.models.NotificationInternalResponse;
import com.blockout.notifications.notification.api.models.NotificationPageInternalResponse;
import com.blockout.notifications.notification.api.models.RegisterPushTokenInternalRequest;
import com.blockout.notifications.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.notifications.notification.application.views.NotificationPageView;
import com.blockout.notifications.notification.application.views.NotificationView;
import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * Maps Notification transport models to application contracts and back.
 */
@Mapper(
    componentModel = "spring",
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface NotificationApiMapper {

    /**
     * Maps an application page to the internal notification response.
     *
     * @param page application notification page.
     * @return generated internal page response.
     */
    NotificationPageInternalResponse toResponse(NotificationPageView page);

    /**
     * Maps an internal token request to the application command.
     *
     * @param request internal push-token request.
     * @return application registration command.
     */
    RegisterPushTokenCommand toCommand(RegisterPushTokenInternalRequest request);

    /**
     * Maps one application notification for nested page conversion.
     *
     * @param notification application notification view.
     * @return generated internal notification response.
     */
    NotificationInternalResponse toResponse(NotificationView notification);
}
