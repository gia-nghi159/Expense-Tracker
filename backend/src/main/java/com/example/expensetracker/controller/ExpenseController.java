package com.example.expensetracker.controller;

import com.example.expensetracker.entity.Expenses;
import com.example.expensetracker.entity.Users; 
import com.example.expensetracker.repository.ExpenseRepo;
import com.example.expensetracker.repository.UserRepo;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    @Autowired
    private ExpenseRepo expenseRepo;

    @Autowired
    private UserRepo userRepo;

    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        Users user = userRepo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return user.getID();
    }

    @GetMapping
    public List<Expenses> getAllExpenses(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        return expenseRepo.findByUserId(userId);
    }

    @PostMapping
    public Expenses createExpense(@Valid @RequestBody Expenses expenses, Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        expenses.setUserId(userId);
        return expenseRepo.save(expenses);
    }

    @GetMapping("/total")
    public ResponseEntity<?> getTotalExpenses(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        BigDecimal total = expenseRepo.getTotalAmountByUserId(userId);
        if (total == null) {
            total = BigDecimal.ZERO;
        }
        return ResponseEntity.ok(Map.of("total", total));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateExpense(@Valid @PathVariable Long id, @Valid @RequestBody Expenses expenseDetails, Authentication authentication) {
        Long userId = getCurrentUserId(authentication);

        Optional<Expenses> optionalExpense = expenseRepo.findById(id);

        if (optionalExpense.isEmpty()) {
            return ResponseEntity.notFound().build(); 
        }

        Expenses existingExpense = optionalExpense.get();

        if (!existingExpense.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to update this expense.");
        }

        existingExpense.setDescription(expenseDetails.getDescription());
        existingExpense.setAmount(expenseDetails.getAmount());
        existingExpense.setCategory(expenseDetails.getCategory());
        existingExpense.setExpenseDate(expenseDetails.getExpenseDate());

        Expenses updatedExpense = expenseRepo.save(existingExpense);
        
        return ResponseEntity.ok(updatedExpense);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteExpense(@PathVariable Long id, Authentication authentication) {
        Long userId = getCurrentUserId(authentication);

        return expenseRepo.findById(id)
            .map(expense -> {
                if (!expense.getUserId().equals(userId)) {
                    return ResponseEntity.status(403).build(); 
                }
                expenseRepo.delete(expense);
                return ResponseEntity.ok().build();
            }).orElse(ResponseEntity.notFound().build());
    }
}
