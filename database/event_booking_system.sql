-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 28, 2025 at 02:50 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `event_booking_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `tickets_count` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `booking_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('confirmed','cancelled') DEFAULT 'confirmed',
  `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `user_id`, `event_id`, `tickets_count`, `total_amount`, `booking_date`, `status`, `payment_status`, `payment_reference`, `updated_at`) VALUES
(3, 1, 4, 2, 60.00, '2025-12-25 06:24:45', 'confirmed', 'paid', NULL, '2025-12-25 06:24:45'),
(4, 1, 5, 1, 20.00, '2025-12-25 08:31:51', 'confirmed', 'paid', NULL, '2025-12-25 08:31:51'),
(5, 1, 6, 3, 30.00, '2025-12-28 06:38:55', 'confirmed', 'paid', NULL, '2025-12-28 06:38:55'),
(6, 1, 2, 1, 25.00, '2025-12-28 06:39:19', 'confirmed', 'paid', NULL, '2025-12-28 06:39:19'),
(8, 6, 4, 2, 60.00, '2025-12-28 13:16:22', 'cancelled', 'refunded', NULL, '2025-12-28 13:16:43'),
(9, 6, 5, 1, 20.00, '2025-12-28 13:16:31', 'confirmed', 'paid', NULL, '2025-12-28 13:16:31');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `category` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `venue` varchar(200) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `available_tickets` int(11) NOT NULL,
  `total_tickets_sold` int(11) DEFAULT 0,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `organizer_id` int(11) DEFAULT NULL,
  `max_tickets_per_user` int(11) DEFAULT 10,
  `status` enum('upcoming','ongoing','completed','cancelled') DEFAULT 'upcoming'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `category`, `date`, `time`, `venue`, `location`, `price`, `available_tickets`, `total_tickets_sold`, `image_url`, `created_at`, `updated_at`, `organizer_id`, `max_tickets_per_user`, `status`) VALUES
(2, 'Web Development Workshop', 'Learn modern web development', 2, '2025-12-29', '10:00:00', 'Tech Hub Center', '456 Tech Avenue, San Francisco, CA', 25.00, 49, 0, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085', '2025-12-13 09:53:16', '2025-12-28 06:39:19', 4, 10, 'upcoming'),
(3, 'Business Conference', 'Annual business conference', 3, '2025-12-30', '09:00:00', 'Convention Center', '789 Business Blvd, Chicago, IL', 100.00, 150, 0, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87', '2025-12-13 09:53:16', '2025-12-25 08:10:07', 4, 10, 'upcoming'),
(4, 'Football Finals', 'National football championship finals', 4, '2025-12-30', '15:00:00', 'National Stadium', '101 Sports Way, Miami, FL', 30.00, 498, 0, 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68', '2025-12-13 09:53:16', '2025-12-28 13:16:43', 4, 10, 'ongoing'),
(5, 'TechSpark 2025: Innovation & Coding Meetup', 'TechSpark 2025 is a one-day technology and coding meetup designed for students and professionals. The event includes keynote talks, hands-on workshops, live coding sessions, and networking opportunities with industry experts.', 7, '2025-12-25', '10:00:00', 'Grand Convention Hall', 'Bengaluru, Karnataka, India', 20.00, 198, 0, NULL, '2025-12-25 08:30:37', '2025-12-28 13:16:31', 1, 10, 'upcoming'),
(6, 'Spark 2026: Coding Meetup', 'Spark 2026: Coding Meetup', 7, '2025-12-28', '10:00:00', 'Grand Convention Hall', 'Bengaluru, Karnataka, India', 10.00, 250, 0, NULL, '2025-12-28 06:36:26', '2025-12-28 13:19:53', 1, 10, 'upcoming'),
(9, 'Test event', 'test', 1, '2025-12-29', '10:00:00', 'Grand Convention Hall', 'Bengaluru, Karnataka, India', 22.00, 212, 0, NULL, '2025-12-28 13:33:31', '2025-12-28 13:33:31', 1, 10, 'ongoing'),
(11, 'TechSpark 2026: Innovation & Coding Meetup', 'TechSpark 2026', 3, '2026-02-09', '10:00:00', 'Grand Convention Hall', 'Bengaluru, Karnataka, India', 20.00, 300, 0, NULL, '2025-12-28 13:38:35', '2025-12-28 13:44:17', 1, 10, 'upcoming'),
(13, 'new event', 'new event', 3, '2025-12-29', '10:00:00', 'Grand Convention Hall', 'Bengaluru, Karnataka, India', 12.00, 200, 0, NULL, '2025-12-28 13:44:38', '2025-12-28 13:44:38', 1, 10, 'upcoming');

-- --------------------------------------------------------

--
-- Table structure for table `event_categories`
--

CREATE TABLE `event_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_categories`
--

INSERT INTO `event_categories` (`id`, `name`, `icon`, `description`, `updated_at`) VALUES
(1, 'concert', 'fa-music', 'Live music performances', '2025-12-25 07:03:34'),
(2, 'workshop', 'fa-laptop-code', 'Learning & skill development events', '2025-12-25 07:03:34'),
(3, 'conference', 'fa-briefcase', 'Business & professional conferences', '2025-12-25 07:03:34'),
(4, 'sports', 'fa-running', 'Sports events and tournaments', '2025-12-25 07:03:34'),
(5, 'festival', 'fa-glass-cheers', 'Cultural and food festivals', '2025-12-25 07:03:34'),
(6, 'exhibition', 'fa-palette', 'Art and product exhibitions', '2025-12-25 07:03:34'),
(7, 'seminar', 'fa-chalkboard-teacher', 'Educational seminars', '2025-12-25 07:03:34'),
(8, 'networking', 'fa-handshake', 'Networking events', '2025-12-25 07:03:34');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('credit_card','paypal','bank_transfer','cash') NOT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed') DEFAULT 'pending',
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `booking_id`, `user_id`, `amount`, `payment_method`, `transaction_id`, `status`, `payment_date`, `updated_at`) VALUES
(3, 3, 1, 60.00, 'cash', 'TXN00000003', 'completed', '2025-12-25 06:24:45', '2025-12-25 07:03:34'),
(4, 4, 1, 20.00, 'cash', 'TXN00000004', 'completed', '2025-12-25 08:31:51', '2025-12-25 08:31:51'),
(5, 5, 1, 30.00, 'cash', 'TXN00000005', 'completed', '2025-12-28 06:38:55', '2025-12-28 06:38:55'),
(6, 6, 1, 25.00, 'cash', 'TXN00000006', 'completed', '2025-12-28 06:39:19', '2025-12-28 06:39:19'),
(8, 8, 6, 60.00, 'cash', 'TXN00000008', '', '2025-12-28 13:16:22', '2025-12-28 13:16:43'),
(9, 9, 6, 20.00, 'cash', 'TXN00000009', 'completed', '2025-12-28 13:16:31', '2025-12-28 13:16:31');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_admin` tinyint(1) DEFAULT 0,
  `phone` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `created_at`, `is_admin`, `phone`, `updated_at`) VALUES
(1, 'sara', 'sara124@gmail.com', '$2a$10$SY/UiDdCDon2wbeljsCf.uaJO5Rsyt/Vh0NLmAWhUYcOvaxoKBDoa', '2025-12-21 07:28:09', 0, NULL, '2025-12-21 07:28:09'),
(4, 'admin', 'admin12@gmail.com', '$2a$10$tqKs3xT1eMkJzulnrJYJGu2lsFTY.AesahiunTBLN62ct5yYq5BLy', '2025-12-24 08:14:30', 1, '6895645564', '2025-12-24 08:14:30'),
(5, 'Event Organizer', 'organizer@events.com', '$2a$10$SY/UiDdCDon2wbeljsCf.uaJO5Rsyt/Vh0NLmAWhUYcOvaxoKBDoa', '2025-12-25 08:10:07', 0, '0000000000', '2025-12-25 08:10:07'),
(6, 'sara', 'saracozy7@gmail.com', '$2a$10$BqGJh6T8eL0iMy/HZh6w9ef/IDumZBtDAaEIoK1H7Mxj47q8k2Q9K', '2025-12-28 13:15:51', 0, NULL, '2025-12-28 13:15:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category` (`category`),
  ADD KEY `events_ibfk_1` (`organizer_id`);

--
-- Indexes for table `event_categories`
--
ALTER TABLE `event_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `event_categories`
--
ALTER TABLE `event_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `events_ibfk_2` FOREIGN KEY (`category`) REFERENCES `event_categories` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
