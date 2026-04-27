import React from 'react';
import './shared.css';

/**
 * Button Component
 * Primary button component with variants
 */
export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    fullWidth = false,
    onClick,
    className = '',
    ...props
}) => {
    const baseClasses = 'btn';
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        outline: 'btn-outline',
        ghost: 'btn-ghost',
        danger: 'btn-danger',
    };
    const sizeClasses = {
        sm: 'btn-sm',
        md: 'btn-md',
        lg: 'btn-lg',
    };

    const classes = [
        baseClasses,
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        fullWidth ? 'btn-full-width' : '',
        loading ? 'btn-loading' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && <span className="btn-spinner" />}
            {children}
        </button>
    );
};

/**
 * Input Component
 * Form input with label and error handling
 */
export const Input = ({
    label,
    id,
    name,
    type = 'text',
    placeholder,
    value,
    onChange,
    onBlur,
    error,
    required = false,
    disabled = false,
    className = '',
    icon,
    rightIcon,
    ...props
}) => {
    return (
        <div className={`input-group ${className}`}>
            {label && (
                <label htmlFor={id || name} className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <div className="input-wrapper">
                {icon && <span className="input-icon input-icon-left">{icon}</span>}
                <input
                    id={id || name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    className={`input ${error ? 'input-error' : ''} ${icon ? 'has-icon-left' : ''} ${rightIcon ? 'has-icon-right' : ''}`}
                    {...props}
                />
                {rightIcon && <span className="input-icon input-icon-right">{rightIcon}</span>}
            </div>
            {error && <span className="input-error-message">{error}</span>}
        </div>
    );
};

/**
 * Select Component
 * Dropdown select with label and error handling
 */
export const Select = ({
    label,
    id,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Select an option',
    error,
    required = false,
    disabled = false,
    className = '',
    ...props
}) => {
    return (
        <div className={`input-group ${className}`}>
            {label && (
                <label htmlFor={id || name} className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <select
                id={id || name}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`select ${error ? 'select-error' : ''}`}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <span className="input-error-message">{error}</span>}
        </div>
    );
};

/**
 * Badge Component
 * Status badges for displaying states
 */
export const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    const variantClasses = {
        default: 'badge-default',
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        info: 'badge-info',
        primary: 'badge-primary',
    };
    const sizeClasses = {
        sm: 'badge-sm',
        md: 'badge-md',
        lg: 'badge-lg',
    };

    const classes = [
        'badge',
        variantClasses[variant] || variantClasses.default,
        sizeClasses[size] || sizeClasses.md,
        className,
    ].filter(Boolean).join(' ');

    return <span className={classes}>{children}</span>;
};

/**
 * Card Component
 * Container card for content
 */
export const Card = ({
    children,
    title,
    subtitle,
    className = '',
    padding = true,
    shadow = true,
}) => {
    return (
        <div className={`card ${shadow ? 'card-shadow' : ''} ${className}`}>
            {(title || subtitle) && (
                <div className="card-header">
                    {title && <h3 className="card-title">{title}</h3>}
                    {subtitle && <p className="card-subtitle">{subtitle}</p>}
                </div>
            )}
            <div className={`card-body ${padding ? '' : 'no-padding'}`}>
                {children}
            </div>
        </div>
    );
};

/**
 * Modal Component
 * Dialog/modal overlay
 */
export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnOverlayClick = true,
}) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'modal-sm',
        md: 'modal-md',
        lg: 'modal-lg',
        xl: 'modal-xl',
    };

    const handleOverlayClick = (e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className={`modal ${sizeClasses[size] || sizeClasses.md}`}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

/**
 * Spinner Component
 * Loading spinner
 */
export const Spinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'spinner-sm',
        md: 'spinner-md',
        lg: 'spinner-lg',
    };

    return (
        <div className={`spinner ${sizeClasses[size] || sizeClasses.md} ${className}`} />
    );
};

/**
 * Alert Component
 * Alert/notification messages
 */
export const Alert = ({
    children,
    variant = 'info',
    dismissible = false,
    onDismiss,
    className = '',
}) => {
    const variantClasses = {
        info: 'alert-info',
        success: 'alert-success',
        warning: 'alert-warning',
        error: 'alert-error',
    };

    return (
        <div className={`alert ${variantClasses[variant] || variantClasses.info} ${className}`}>
            <div className="alert-content">{children}</div>
            {dismissible && (
                <button className="alert-dismiss" onClick={onDismiss}>
                    ×
                </button>
            )}
        </div>
    );
};

export default {
    Button,
    Input,
    Select,
    Badge,
    Card,
    Modal,
    Spinner,
    Alert,
};
