-- =============================================================================
-- Etihad Plaza Hotel TV — CMS database schema
-- MySQL 5.7+ / MariaDB 10.2+
-- Run: mysql -u USER -p DB_NAME < hotel_cms_schema.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop child tables first (FK order)
DROP TABLE IF EXISTS `cms_notification_reads`;
DROP TABLE IF EXISTS `cms_emergency_alert_log`;
DROP TABLE IF EXISTS `cms_notifications`;
DROP TABLE IF EXISTS `cms_emergency_alert`;
DROP TABLE IF EXISTS `cms_facilities`;

-- -----------------------------------------------------------------------------
-- 1) Current emergency alert (single logical row; TV polls ?api=alert)
--    Your PHP should SELECT this row and output JSON the app understands.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cms_emergency_alert` (
  `id`              TINYINT UNSIGNED NOT NULL DEFAULT 1 PRIMARY KEY,
  `active`          TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = show modal on TV',
  `alert_type`      VARCHAR(64)  NOT NULL DEFAULT 'EMERGENCY_ALERT',
  `title`           VARCHAR(512) NOT NULL DEFAULT '',
  `message`         TEXT         NOT NULL,
  `severity`        VARCHAR(32)  NOT NULL DEFAULT 'warning' COMMENT 'info|warning|critical',
  `cta_label`       VARCHAR(255) NULL DEFAULT NULL,
  `cta_url`         VARCHAR(2048) NULL DEFAULT NULL,
  `auto_dismiss_ms` INT UNSIGNED NULL DEFAULT NULL,
  `triggered_at`    DATETIME NULL DEFAULT NULL,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cms_emergency_alert` (`id`, `active`, `alert_type`, `title`, `message`, `severity`)
VALUES (1, 0, 'EMERGENCY_ALERT', '', '', 'info')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- -----------------------------------------------------------------------------
-- 2) Guest messages / notifications (TV polls ?api=notifications)
-- -----------------------------------------------------------------------------
CREATE TABLE `cms_notifications` (
  `id`         VARCHAR(64)  NOT NULL PRIMARY KEY COMMENT 'stable id e.g. n_20260323_001',
  `title`      VARCHAR(512) NOT NULL DEFAULT '',
  `message`    TEXT         NOT NULL,
  `seen`       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'global seen; optional',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3) Optional: audit trail when you trigger/dismiss alerts from CMS
-- -----------------------------------------------------------------------------
CREATE TABLE `cms_emergency_alert_log` (
  `log_id`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `action`      VARCHAR(32)  NOT NULL COMMENT 'trigger|dismiss|update',
  `title`       VARCHAR(512) NULL,
  `message`     TEXT         NULL,
  `severity`    VARCHAR(32)  NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4) Optional: per-room “seen” for messages (if TVs identify by room code)
--    Skip if you only use AsyncStorage on the device.
-- -----------------------------------------------------------------------------
CREATE TABLE `cms_notification_reads` (
  `notification_id` VARCHAR(64) NOT NULL,
  `room_code`       VARCHAR(32) NOT NULL,
  `read_at`         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`, `room_code`),
  CONSTRAINT `fk_read_notification`
    FOREIGN KEY (`notification_id`) REFERENCES `cms_notifications` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5) Facilities (TV Facilities screen — `api/get_guest_facilities.php`)
-- -----------------------------------------------------------------------------
CREATE TABLE `cms_facilities` (
  `id`          VARCHAR(64)   NOT NULL PRIMARY KEY,
  `label`       VARCHAR(255)  NOT NULL DEFAULT '',
  `name`        VARCHAR(255)  NOT NULL DEFAULT '',
  `description` TEXT          NOT NULL,
  `phone`       VARCHAR(64)   NOT NULL DEFAULT '',
  `image_url`   VARCHAR(2048) NOT NULL DEFAULT '',
  `hours`       JSON          NOT NULL,
  `sort_order`  INT UNSIGNED  NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cms_facilities` (`id`, `label`, `name`, `description`, `phone`, `image_url`, `hours`, `sort_order`, `is_active`) VALUES
('gym', 'Gym', 'Gym',
 'Our state-of-the-art fitness centre features the latest cardio and strength equipment, free weights, and dedicated stretching zones.',
 '02 511 5100',
 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&q=70&fit=crop',
 '[["Monday","6AM – 11PM"],["Tuesday","6AM – 11PM"],["Wednesday","6AM – 11PM"],["Thursday","6AM – 11PM"],["Friday","7AM – 11PM"],["Saturday","7AM – 11PM"],["Sunday","7AM – 11PM"]]',
 1, 1),
('spa', 'Wellness & Spa', 'Wellness & Spa',
 'Escape to a sanctuary of calm. Our Wellness & Spa offers a full menu of treatments.',
 '02 511 5200',
 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&q=70&fit=crop',
 '[["Monday","9AM – 10PM"],["Tuesday","9AM – 10PM"],["Wednesday","9AM – 10PM"],["Thursday","9AM – 10PM"],["Friday","10AM – 10PM"],["Saturday","10AM – 10PM"],["Sunday","10AM – 10PM"]]',
 2, 1),
('pool', 'Swimming Pool', 'Swimming Pool',
 'Dive into our stunning outdoor pool set against a backdrop of illuminated palms.',
 '02 511 5300',
 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&q=70&fit=crop',
 '[["Monday","7AM – 10PM"],["Tuesday","7AM – 10PM"],["Wednesday","7AM – 10PM"],["Thursday","7AM – 10PM"],["Friday","7AM – 11PM"],["Saturday","7AM – 11PM"],["Sunday","7AM – 11PM"]]',
 3, 1),
('medical', 'Etihad Airways Medical Center', 'Etihad Airways Medical Center',
 'Established in 2004, EAMC has pioneered aviation medicine in the region.',
 '02 511 5555',
 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&q=70&fit=crop',
 '[["Monday","8AM – 9PM"],["Tuesday","8AM – 9PM"],["Wednesday","8AM – 9PM"],["Thursday","8AM – 9PM"],["Friday","8AM – 9PM"],["Saturday","9AM – 9PM"],["Sunday","9AM – 9PM"]]',
 4, 1);

SET FOREIGN_KEY_CHECKS = 1;
