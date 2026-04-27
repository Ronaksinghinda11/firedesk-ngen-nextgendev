import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Save,
  ArrowLeft,
  Camera,
  Shield,
  Calendar,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  userType: string;
  name: string;
  email: string;
  phone: string;
  display_name: string;
  profile_pic: string;
  loginID: string;
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileData {
  userType: string;
  name: string;
  display_name: string;
  phone: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}

export default function ProfileSettings() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string>("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [removedImage, setRemovedImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    display_name: "",
    currentPassword: "",
    newPassword: "",
  });

  // Locally handle updating the displayed user/profile info on this page.
  // This avoids dependency on a context method that may not exist.
  const updateUser = (updated: UserProfile) => {
    setUser(updated);
    setFormData((prev) => ({
      ...prev,
      name: updated.name || "",
      email: updated.email || "",
      phone: updated.phone || "",
      display_name: updated.display_name || "",
      currentPassword: "",
      newPassword: "",
    }));
  };

  useEffect(() => {
    if (authUser) {
      setUser(authUser as unknown as UserProfile);
      setFormData({
        name: authUser.name || "",
        email: authUser.email || "",
        phone: authUser.phone || "",
        display_name: authUser.display_name || "",
        currentPassword: "",
        newPassword: "",
      });
      setSelectedImagePreview("");
      setSelectedImageFile(null);
      setRemovedImage(false);
    }
  }, [authUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!user) {
        toast({
          title: "Error",
          description: "User data not loaded",
          variant: "destructive",
        });
        return;
      }

      const updateData: UpdateProfileData = {
        userType: user.userType,
        name: formData.name,
        display_name: formData.display_name,
        phone: formData.phone,
        email: user.userType === "admin" ? formData.email : user.email,
      };

      if (
        showPasswordFields &&
        formData.currentPassword &&
        formData.newPassword
      ) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const hasChanges =
        formData.name !== user.name ||
        (user.userType === "admin" && formData.email !== user.email) ||
        formData.phone !== user.phone ||
        formData.display_name !== user.display_name ||
        (showPasswordFields &&
          formData.currentPassword &&
          formData.newPassword) ||
        selectedImageFile ||
        removedImage;

      if (!hasChanges) {
        toast({
          title: "No changes made",
          description: "Your profile information is up to date.",
        });
        return;
      }

      // Update profile using /auth/profile endpoint
      // Support backend expectations: Base64 string for image in JSON payload

      const payload: any = { ...updateData };

      if (selectedImageFile && selectedImagePreview) {
        payload.profile_pic = selectedImagePreview;
      } else if (removedImage) {
        payload.profile_pic = "";
      }

      // Use the generic /auth/profile endpoint which handles all user types self-update
      const response = await api.put<any>("/auth/profile", payload);

      const updatedProfile = response.user || response.admin;

      if (updatedProfile) {
        setUser(updatedProfile);
        updateUser(updatedProfile);
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
        }));
        setShowPasswordFields(false);
        setSelectedImageFile(null);
        setSelectedImagePreview("");
        setRemovedImage(false);

        toast({
          title: "Profile updated successfully",
          description: "Your changes have been saved.",
        });
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onAvatarButtonClick = () => {
    fileInputRef.current?.click();
  };

  const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onRemoveImage = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    setRemovedImage(true);
    toast({
      title: "Image removed",
      description: "Profile image will be cleared on save.",
    });
  };

  const getUserInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const togglePasswordFields = () => {
    setShowPasswordFields(!showPasswordFields);
    if (showPasswordFields) {
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
      }));
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Profile Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Form */}
        <Card className="lg:col-span-2 card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleInputChange}
                    placeholder="Enter display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                    {user.userType !== "admin" && (
                      <span className="text-xs text-muted-foreground font-normal">
                        (Admin only)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    disabled={user.userType !== "admin"}
                    className={
                      user.userType !== "admin"
                        ? "bg-muted cursor-not-allowed"
                        : ""
                    }
                  />
                  {user.userType !== "admin" && (
                    <p className="text-xs text-muted-foreground">
                      Only administrators can change email addresses. Contact
                      your admin for assistance.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              {/* Password Change Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Change Password
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Update your password for enhanced security
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={togglePasswordFields}
                  >
                    {showPasswordFields ? "Cancel" : "Change Password"}
                  </Button>
                </div>

                {showPasswordFields && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">
                        Current Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          placeholder="Enter current password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password *</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          placeholder="Enter new password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Profile Sidebar */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <UserAvatar
                    userId={user.id}
                    name={user.name}
                    className="h-24 w-24 border-4 border-orange-100"
                    fallbackSrc={selectedImagePreview}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={onImageFileChange}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                        title="Profile image options"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={onAvatarButtonClick}>
                        Add New Image
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onRemoveImage}>
                        Remove Image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {user.userType}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-sm font-mono">
                  {user.id.slice(0, 8)}...
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Login ID</span>
                <span className="text-sm">{user.loginID || "Not set"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Member since
                </span>
                <span className="text-sm text-right">
                  {formatDate(user.createdAt)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Last updated
                </span>
                <span className="text-sm text-right">
                  {formatDate(user.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={togglePasswordFields}
              >
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
