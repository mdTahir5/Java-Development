package com.phonebook.service;

import com.phonebook.dto.ContactDto;
import com.phonebook.dto.ContactRequest;
import com.phonebook.exception.ResourceNotFoundException;
import com.phonebook.model.Contact;
import com.phonebook.model.User;
import com.phonebook.repository.ContactRepository;
import com.phonebook.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    public ContactService(ContactRepository contactRepository, UserRepository userRepository) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ContactDto> getContacts(Long userId, String search) {
        List<Contact> contacts;
        if (search != null && !search.trim().isEmpty()) {
            contacts = contactRepository.searchContacts(userId, search.trim());
        } else {
            contacts = contactRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }

        return contacts.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ContactDto getContactById(Long userId, Long contactId) {
        Contact contact = contactRepository.findByIdAndUserId(contactId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + contactId));
        return mapToDto(contact);
    }

    @Transactional
    public ContactDto createContact(Long userId, ContactRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Contact contact = new Contact();
        contact.setName(request.getName().trim());
        contact.setEmail(request.getEmail() != null ? request.getEmail().trim() : null);
        contact.setPhone(request.getPhone().trim());
        contact.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        contact.setUser(user);

        Contact savedContact = contactRepository.save(contact);
        return mapToDto(savedContact);
    }

    @Transactional
    public ContactDto updateContact(Long userId, Long contactId, ContactRequest request) {
        Contact contact = contactRepository.findByIdAndUserId(contactId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + contactId));

        contact.setName(request.getName().trim());
        contact.setEmail(request.getEmail() != null ? request.getEmail().trim() : null);
        contact.setPhone(request.getPhone().trim());
        contact.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);

        Contact updatedContact = contactRepository.save(contact);
        return mapToDto(updatedContact);
    }

    @Transactional
    public void deleteContact(Long userId, Long contactId) {
        Contact contact = contactRepository.findByIdAndUserId(contactId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found with id: " + contactId));

        contactRepository.delete(contact);
    }

    private ContactDto mapToDto(Contact contact) {
        return new ContactDto(
                contact.getId(),
                contact.getName(),
                contact.getEmail(),
                contact.getPhone(),
                contact.getAddress(),
                contact.getUser() != null ? contact.getUser().getId() : null,
                contact.getCreatedAt(),
                contact.getUpdatedAt()
        );
    }
}
