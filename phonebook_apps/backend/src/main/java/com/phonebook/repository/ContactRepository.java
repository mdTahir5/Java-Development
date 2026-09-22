package com.phonebook.repository;

import com.phonebook.model.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContactRepository extends JpaRepository<Contact, Long> {
    List<Contact> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Contact> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT c FROM Contact c WHERE c.user.id = :userId AND (" +
           "LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.address) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY c.createdAt DESC")
    List<Contact> searchContacts(@Param("userId") Long userId, @Param("search") String search);

    long countByUserId(Long userId);
}
