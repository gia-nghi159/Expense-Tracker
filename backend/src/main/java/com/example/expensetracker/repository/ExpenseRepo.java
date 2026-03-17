package com.example.expensetracker.repository;

import com.example.expensetracker.entity.Expenses;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;

public interface ExpenseRepo extends JpaRepository<Expenses, Long> {

    List<Expenses> findByUserId(Long userId);

    @Query("SELECT SUM(e.amount) FROM Expenses e WHERE e.userId = :userId")
    BigDecimal getTotalAmountByUserId(Long userId);
}