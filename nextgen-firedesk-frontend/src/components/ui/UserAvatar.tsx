import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { User } from "lucide-react";

interface UserAvatarProps {
    userId?: string;
    name?: string;
    className?: string;
    fallbackSrc?: string; // For previews or legacy base64
    showFallbackDelay?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
    userId,
    name,
    className,
    fallbackSrc,
    showFallbackDelay = 600,
}) => {
    const [imgSrc, setImgSrc] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        // If we have a direct source (like a preview base64), use it
        if (fallbackSrc) {
            setImgSrc(fallbackSrc);
            return;
        }

        if (!userId) {
            setImgSrc("");
            return;
        }

        let isMounted = true;
        const fetchAvatar = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/users/${userId}/avatar`, {
                    responseType: "blob",
                });
                if (isMounted && response) {
                    const url = URL.createObjectURL(response as any); // Cast because interceptor might return data directly, but responseType blob usually returns blob
                    setImgSrc(url);
                }
            } catch (error) {
                // Silently fail to fallback
                console.log("Avatar fetch failed", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAvatar();

        return () => {
            isMounted = false;
            if (imgSrc && imgSrc.startsWith("blob:")) {
                URL.revokeObjectURL(imgSrc);
            }
        };
    }, [userId, fallbackSrc]);

    const getInitials = (n?: string) => {
        if (!n) return "U";
        const parts = n.split(" ");
        if (parts.length >= 2) {
            return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
        }
        return n.charAt(0).toUpperCase();
    };

    return (
        <Avatar className={className}>
            <AvatarImage src={imgSrc} alt={name || "User"} />
            <AvatarFallback delayMs={showFallbackDelay}>
                {name ? getInitials(name) : <User className="h-4 w-4" />}
            </AvatarFallback>
        </Avatar>
    );
};
