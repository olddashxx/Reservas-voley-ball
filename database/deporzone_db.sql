-- ============================================================================
-- BASE DE DATOS: DEPORZONE WALLY PARK
-- Materia: Diseño Web II (UPDS) - Proyecto Integrador Full Stack
-- Servidor: MySQL (XAMPP) / phpMyAdmin
-- Cotejamiento: utf8mb4_unicode_ci
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `deporzone_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `deporzone_db`;

-- ----------------------------------------------------------------------------
-- 1. TABLA: usuarios
-- Roles: 'cliente', 'trabajador', 'admin'
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `reservas`;
DROP TABLE IF EXISTS `canchas`;
DROP TABLE IF EXISTS `usuarios`;

CREATE TABLE `usuarios` (
  `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre_completo` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol` ENUM('cliente', 'trabajador', 'admin') NOT NULL DEFAULT 'cliente',
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserción de 3 usuarios de prueba con contraseñas encriptadas (bcrypt)
-- Admin:      admin@deporzone.bo     / Admin1234
-- Trabajador: recepcion@deporzone.bo / Trabajador1234
-- Cliente:    gabriel.ramos@gmail.com / Cliente1234
INSERT INTO `usuarios` (`id_usuario`, `nombre_completo`, `correo`, `password_hash`, `rol`) VALUES
(1, 'Administrador General', 'admin@deporzone.bo', '$2y$10$aq9mzr5yV9/mBKKxoHRKH.k5BC.2ChItna8uuPs2BwnTRfREaMYAG', 'admin'),
(2, 'Encargado de Recepción', 'recepcion@deporzone.bo', '$2y$10$wtQjCKxnSFOT0eHMWGtio.GiWeo1frsc3SOqxgl8vjbW6tGW4.DMS', 'trabajador'),
(3, 'Gabriel Ramos Cruz', 'gabriel.ramos@gmail.com', '$2y$10$uxZ/d8rC2M7Fn.d0VHGtuenGPCUR8T1GVXjwlkp9l.QYxUOrc3/L2', 'cliente');

-- ----------------------------------------------------------------------------
-- 2. TABLA: canchas
-- Identificadores de C1 a C6 con tarifas oficiales del complejo
-- ----------------------------------------------------------------------------
CREATE TABLE `canchas` (
  `id_cancha` VARCHAR(10) PRIMARY KEY,
  `nombre` VARCHAR(60) NOT NULL,
  `superficie` VARCHAR(40) NOT NULL,
  `precio_hora` DECIMAL(6,2) NOT NULL,
  `estado` ENUM('disponible', 'mantenimiento') NOT NULL DEFAULT 'disponible'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `canchas` (`id_cancha`, `nombre`, `superficie`, `precio_hora`, `estado`) VALUES
('C1', 'Cancha 1: Illimani VIP', 'Madera Flotante', 80.00, 'disponible'),
('C2', 'Cancha 2: Tunari Master', 'Madera Reglamentaria', 70.00, 'disponible'),
('C3', 'Cancha 3: Urkupiña Club', 'Sintético Cushion', 75.00, 'disponible'),
('C4', 'Cancha 4: La Cancha Pro', 'Poliuretano', 65.00, 'disponible'),
('C5', 'Cancha 5: La Tradicional', 'Cemento Alisado', 50.00, 'disponible'),
('C6', 'Cancha 6: Tercer Tiempo', 'Cemento + Gradería', 55.00, 'disponible');

-- ----------------------------------------------------------------------------
-- 3. TABLA: reservas
-- Estados: 'pendiente', 'en_cancha', 'completada', 'cancelada'
-- ----------------------------------------------------------------------------
CREATE TABLE `reservas` (
  `id_reserva` INT AUTO_INCREMENT PRIMARY KEY,
  `titular_nombre` VARCHAR(100) NOT NULL,
  `celular` VARCHAR(8) NOT NULL,
  `correo` VARCHAR(100) NOT NULL,
  `id_cancha` VARCHAR(10) NOT NULL,
  `fecha` DATE NOT NULL,
  `hora_inicio` VARCHAR(10) NOT NULL,
  `duracion_horas` INT NOT NULL DEFAULT 1,
  `modalidad` VARCHAR(40) NOT NULL DEFAULT 'terna',
  `adicionales` VARCHAR(150) NULL DEFAULT '',
  `total_bs` DECIMAL(8,2) NOT NULL,
  `estado` ENUM('pendiente', 'en_cancha', 'completada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reservas_cancha` FOREIGN KEY (`id_cancha`) REFERENCES `canchas` (`id_cancha`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reservas iniciales de demostración
INSERT INTO `reservas` (`titular_nombre`, `celular`, `correo`, `id_cancha`, `fecha`, `hora_inicio`, `duracion_horas`, `modalidad`, `adicionales`, `total_bs`, `estado`) VALUES
('Gabriel Ramos Cruz', '78854844', 'gabriel.ramos@gmail.com', 'C1', CURDATE(), '19:00', 1, 'Terna Varones (3 vs 3)', 'Balón Mikasa', 90.00, 'pendiente'),
('Carlos Mendoza Flores', '76543210', 'carlos.mendoza@gmail.com', 'C2', CURDATE(), '20:00', 1, 'Terna Mixto (3 vs 3)', 'Juego de Ponchillos', 85.00, 'en_cancha');
