package com.phonebook.controller;

import com.phonebook.dto.ApiResponse;
import com.phonebook.dto.ContactDto;
import com.phonebook.dto.ContactRequest;
import com.phonebook.security.CustomUserDetails;
import com.phonebook.service.ContactService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ContactDto>>> getAllContacts(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ContactDto> contacts = contactService.getContacts(userDetails.getId(), search);
        return ResponseEntity.ok(ApiResponse.ok("Contacts retrieved successfully", contacts));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContactDto>> getContactById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ContactDto contact = contactService.getContactById(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Contact retrieved successfully", contact));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ContactDto>> createContact(
            @Valid @RequestBody ContactRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ContactDto created = contactService.createContact(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Contact added successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ContactDto>> updateContact(
            @PathVariable Long id,
            @Valid @RequestBody ContactRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ContactDto updated = contactService.updateContact(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.ok("Contact updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteContact(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        contactService.deleteContact(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Contact deleted successfully", null));
    }
}
