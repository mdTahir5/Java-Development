package com.phonebook.controller;

import com.phonebook.dto.ApiResponse;
import com.phonebook.security.CustomUserDetails;
import com.phonebook.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteMyAccount(@AuthenticationPrincipal CustomUserDetails userDetails) {
        userService.deleteAccount(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok("User account and all associated contacts permanently deleted", null));
    }
}
