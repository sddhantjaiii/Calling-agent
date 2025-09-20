import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import {
  Settings,
  Mail,
  Bell,
  Edit,
  Lock,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { User } from "@/types/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash } from "lucide-react";
import { validateForm, validateField, validationSchemas } from "@/utils/formValidation";
import {
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS
} from "@/utils/serverValidationHandler";
import { toast } from "sonner";

// Task 5: Chat agent token purchase features commented out as per requirements 2.1, 2.2, 2.3, 5.4
// No specific chat agent token purchase features were found in this settings page.
// The billing functionality in this application is for general platform credits, not chat agent tokens.

interface SettingsCardProps {
  profileData?: {
    name?: string;
    email?: string;
    company?: string;
    website?: string;
    location?: string;
    bio?: string;
    phone?: string;
  };
  onSave?: (data: {
    name: string;
    email: string;
    company?: string;
    website?: string;
    location?: string;
    bio?: string;
    phone?: string;
    notifications: boolean;
    password?: string;
    // Commented out 2FA as per requirements 3.1, 5.4
    // twoFA: boolean;
  }) => Promise<void> | void;
}

export default function SettingsCard({
  profileData = {},
  onSave = () => { },
}: SettingsCardProps) {
  const { theme } = useTheme();

  // State for editable fields
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  const [name, setName] = useState(profileData.name || "");
  const [email, setEmail] = useState(profileData.email || "");
  const [company, setCompany] = useState(profileData.company || "");
  const [website, setWebsite] = useState(profileData.website || "");
  const [location, setLocation] = useState(profileData.location || "");
  const [bio, setBio] = useState(profileData.bio || "");
  const [phone, setPhone] = useState(profileData.phone || "");
  const [notifications, setNotifications] = useState(true);

  // Password update fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confPassword, setConfPassword] = useState("");
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);

  // Commented out 2FA functionality as per requirements 3.1, 5.4
  // const [twoFA, setTwoFA] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Merge client and server errors (server errors take precedence)
  const validationErrors = mergeValidationErrors(clientErrors, serverErrors);

  // Remove duplicate API call - use profileData prop instead
  // Set loading to false since parent component handles data loading
  useEffect(() => {
    setLoading(false);
  }, []);

  // Update form fields when profileData prop changes
  useEffect(() => {
    if (profileData) {
      setName(profileData.name || "");
      setEmail(profileData.email || "");
      setCompany(profileData.company || "");
      setWebsite(profileData.website || "");
      setLocation(profileData.location || "");
      setBio(profileData.bio || "");
      setPhone(profileData.phone || "");
    }
  }, [profileData]);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.settings,
    {
      showToast: true,
      toastTitle: 'Settings Update Failed',
    }
  );

  // Team members functionality commented out as requested
  /*
  // Editable team members state (all changes pending until Save)
  type Member = { name: string; role: "Owner" | "can edit" | "can view" };
  const initialMembers: Member[] = [
    { name: "Pravalika", role: "Owner" },
    { name: "Nitya Jain", role: "can view" },
    { name: "Siddhant Jaiswal", role: "can view" },
    { name: "sniperthink (you)", role: "Owner" }, // Another owner for sample; only one should be "Owner"
  ];
  const [members, setMembers] = useState<Member[]>(initialMembers);

  // Track pending team member state to persist on Save
  const [pendingMembers, setPendingMembers] =
    useState<Member[]>(initialMembers);

  function handleMemberRoleChange(idx: number, role: "can edit" | "can view") {
    setPendingMembers((members) =>
      members.map((m, i) => (i === idx ? { ...m, role } : m))
    );
  }

  function handleDeleteMember(idx: number) {
    setPendingMembers((members) => members.filter((_, i) => i !== idx));
  }
  */

  // When toggling edit mode ON/OFF
  function handleEditToggle() {
    setEditMode((em) => !em);
    setPasswordError("");
  }

  const validateFormData = (): boolean => {
    const formData = {
      name,
      email,
      company,
      website,
      phone,
      location,
      bio,
      oldPassword,
      newPassword,
      confPassword
    };

    const result = validateForm(formData, validationSchemas.settings);
    const errors = { ...result.errors };

    // Clear server errors when doing client validation
    setServerErrors({});

    // Custom password validation
    if ((newPassword || confPassword) && !oldPassword) {
      errors.oldPassword = 'Current password is required to change password';
    }

    if (newPassword && confPassword && newPassword !== confPassword) {
      errors.confPassword = 'New passwords do not match';
    }

    setClientErrors(errors);

    // Mark all fields as touched
    setTouchedFields({
      name: true,
      email: true,
      company: true,
      website: true,
      phone: true,
      location: true,
      bio: true,
      oldPassword: true,
      newPassword: true,
      confPassword: true
    });

    return Object.keys(errors).length === 0;
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Validate individual field
    const formData = {
      name,
      email,
      company,
      website,
      phone,
      location,
      bio,
      oldPassword,
      newPassword,
      confPassword
    };

    const schema = validationSchemas.settings;
    const fieldRules = schema[field as keyof typeof schema];

    if (fieldRules) {
      const result = validateField(formData[field as keyof typeof formData], fieldRules, field);
      let error = result.error;

      // Custom password validation
      if (field === 'oldPassword' && (newPassword || confPassword) && !oldPassword) {
        error = 'Current password is required to change password';
      } else if (field === 'confPassword' && newPassword && confPassword && newPassword !== confPassword) {
        error = 'New passwords do not match';
      }

      if (error) {
        setClientErrors(prev => ({ ...prev, [field]: error! }));
      } else {
        setClientErrors(prev => ({ ...prev, [field]: '' }));
      }

      // Clear server error for this field when user is actively fixing it
      if (serverErrors[field]) {
        setServerErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Clear both client and server errors when user starts typing
    if (clientErrors[field]) {
      setClientErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (serverErrors[field]) {
      setServerErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Update the appropriate state
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'company':
        setCompany(value);
        break;
      case 'website':
        setWebsite(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'location':
        setLocation(value);
        break;
      case 'bio':
        setBio(value);
        break;
      case 'oldPassword':
        setOldPassword(value);
        break;
      case 'newPassword':
        setNewPassword(value);
        break;
      case 'confPassword':
        setConfPassword(value);
        break;
    }
  };

  // Save handler -- disables edit mode on submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMode) return;

    // Validate form using the validation schema
    if (!validateFormData()) {
      return;
    }

    setPasswordError("");
    if (oldPassword && newPassword && confPassword) {
      // Handle password update separately
      setIsPasswordConfirmOpen(true);
    } else {
      try {
        // Use the onSave prop to handle the profile update (without password)
        await onSave({
          name,
          email,
          company,
          website,
          location,
          bio,
          phone,
          notifications,
          // Commented out 2FA as per requirements 3.1, 5.4
          // twoFA,
        });

        // If successful, exit edit mode
        setEditMode(false);
        // Note: Success toast is handled by the parent component
      } catch (error) {
        console.error("Settings save error:", error);

        // Try to handle as server validation error first
        const wasValidationError = handleServerValidation(error);

        if (!wasValidationError) {
          // Handle other specific error types
          const errorObj = error as any;

          if (errorObj?.code === 'UNAUTHORIZED') {
            toast.error('Session Expired', {
              description: 'Please log in again to continue.',
            });
          } else if (errorObj?.code === 'NETWORK_ERROR') {
            toast.error('Network Error', {
              description: 'Please check your internet connection and try again.',
            });
          } else {
            // Generic error handling
            toast.error('Error', {
              description: errorObj?.message || 'Failed to update settings. Please try again.',
            });
          }
        }
      }
    }
  };

  const handleConfirmPasswordSave = async () => {
    setIsPasswordConfirmOpen(false);

    try {
      // Update password using API service directly
      await apiService.updatePassword(oldPassword, newPassword);

      // If successful, clear password fields and exit edit mode
      setOldPassword("");
      setNewPassword("");
      setConfPassword("");
      setEditMode(false);

      toast.success('Password Updated', {
        description: 'Your password has been updated successfully.',
      });
    } catch (error) {
      console.error("Password update error:", error);

      // Try to handle as server validation error first
      const wasValidationError = handleServerValidation(error);

      if (!wasValidationError) {
        // Handle other specific error types
        const errorObj = error as any;

        if (errorObj?.code === 'INVALID_PASSWORD') {
          setServerErrors({ oldPassword: 'Current password is incorrect' });
          toast.error('Invalid Password', {
            description: 'The current password you entered is incorrect.',
          });
        } else if (errorObj?.code === 'UNAUTHORIZED') {
          toast.error('Session Expired', {
            description: 'Please log in again to continue.',
          });
        } else if (errorObj?.code === 'NETWORK_ERROR') {
          toast.error('Network Error', {
            description: 'Please check your internet connection and try again.',
          });
        } else {
          // Generic error handling
          toast.error('Error', {
            description: errorObj?.message || 'Failed to update password. Please try again.',
          });
        }
      }
    }
  };

  // All fields are prefilled and editable only when in editMode
  return (
    <Card
      className={`shadow-2xl border-0 transition-colors w-full animate-fade-in 
      ${theme === "dark"
          ? "bg-gradient-to-br from-slate-900 via-slate-950 to-black"
          : "bg-gradient-to-br from-white via-slate-50 to-gray-100"
        }`}
    >
      <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700 flex flex-row items-center justify-between">
        {/* Left side - Icon and Text */}
        <div className="flex items-start gap-3">
          <Mail className="w-6 h-6 mt-1 text-blue-400" />
          <div className="flex-1">
            <CardTitle
              className={`text-xl tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"
                }`}
            >
              Profile Information
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-slate-400">
              Manage your personal information and account settings.
            </CardDescription>
          </div>
        </div>
        
        {/* Right side - Edit Profile button */}
        <div className="ml-4">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleEditToggle}
            type="button"
          >
            <Edit className="w-4 h-4" />
            {editMode ? "Cancel" : "Edit Profile"}
          </Button>
        </div>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="py-7 space-y-7">
          {/* Personal Info */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ValidatedInput
                label="Name"
                value={name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                autoComplete="off"
                required
                readOnly={!editMode}
                error={validationErrors.name}
                touched={touchedFields.name}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                maxLength={100}
                description="Your full name"
              />
              <ValidatedInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                autoComplete="off"
                required
                readOnly={!editMode}
                error={validationErrors.email}
                touched={touchedFields.email}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                description="Your email address"
              />
              <ValidatedInput
                label="Organization"
                value={company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                onBlur={() => handleFieldBlur('company')}
                autoComplete="off"
                readOnly={!editMode}
                error={validationErrors.company}
                touched={touchedFields.company}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                maxLength={100}
                description="Your company or organization"
              />
              <ValidatedInput
                label="Website"
                type="url"
                placeholder="https://"
                value={website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                onBlur={() => handleFieldBlur('website')}
                readOnly={!editMode}
                error={validationErrors.website}
                touched={touchedFields.website}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                description="Your website URL"
              />
              <ValidatedInput
                label="Phone"
                type="tel"
                placeholder="+91"
                value={phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                readOnly={!editMode}
                error={validationErrors.phone}
                touched={touchedFields.phone}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                description="Your phone number"
              />
              <ValidatedInput
                label="Location"
                type="text"
                value={location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                onBlur={() => handleFieldBlur('location')}
                readOnly={!editMode}
                error={validationErrors.location}
                touched={touchedFields.location}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                maxLength={100}
                description="Your location"
              />
              <ValidatedInput
                label="Bio"
                type="text"
                value={bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                onBlur={() => handleFieldBlur('bio')}
                placeholder="Short description about you"
                readOnly={!editMode}
                error={validationErrors.bio}
                touched={touchedFields.bio}
                className={`sm:col-span-2 transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                maxLength={500}
                showCharCount
                description="A brief description about yourself"
              />
            </div>
          </section>
          <Separator />

          {/* Notifications */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <Bell className={`w-5 h-5 transition-all duration-300 ${
                !editMode 
                  ? "text-yellow-400/50 opacity-60" 
                  : "text-yellow-400 opacity-100"
              }`} />
              <h3
                className={`font-semibold text-lg transition-all duration-300 ${
                  !editMode
                    ? theme === "dark" 
                      ? "text-slate-400 opacity-60" 
                      : "text-gray-600 opacity-70"
                    : theme === "dark" 
                      ? "text-white opacity-100" 
                      : "text-gray-800 opacity-100"
                }`}
              >
                Notifications
              </h3>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span
                className={`font-medium transition-all duration-300 ${
                  !editMode
                    ? theme === "dark" 
                      ? "text-slate-500 opacity-60" 
                      : "text-gray-600 opacity-70"
                    : theme === "dark" 
                      ? "text-slate-200 opacity-100" 
                      : "text-gray-900 opacity-100"
                }`}
              >
                Enable Notifications
              </span>
              <div className={`transition-all duration-300 ${!editMode ? "opacity-60" : "opacity-100"}`}>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  disabled={!editMode}
                />
              </div>
            </div>
          </section>
          <Separator />

          <section>
            <div className="flex items-center gap-3 mb-2">
              <Lock className={`w-5 h-5 transition-all duration-300 ${
                !editMode 
                  ? "text-rose-400/50 opacity-60" 
                  : "text-rose-400 opacity-100"
              }`} />
              <h3
                className={`font-semibold text-lg transition-all duration-300 ${
                  !editMode
                    ? theme === "dark" 
                      ? "text-slate-400 opacity-60" 
                      : "text-gray-600 opacity-70"
                    : theme === "dark" 
                      ? "text-white opacity-100" 
                      : "text-gray-800 opacity-100"
                }`}
              >
                Update Password
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ValidatedInput
                label="Current Password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => handleInputChange('oldPassword', e.target.value)}
                onBlur={() => handleFieldBlur('oldPassword')}
                readOnly={!editMode}
                error={validationErrors.oldPassword}
                touched={touchedFields.oldPassword}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                description="Enter your current password"
              />
              <ValidatedInput
                label="New Password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                onBlur={() => handleFieldBlur('newPassword')}
                readOnly={!editMode}
                error={validationErrors.newPassword}
                touched={touchedFields.newPassword}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                description="Choose a strong password"
              />
              <ValidatedInput
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                value={confPassword}
                onChange={(e) => handleInputChange('confPassword', e.target.value)}
                onBlur={() => handleFieldBlur('confPassword')}
                readOnly={!editMode}
                error={validationErrors.confPassword}
                touched={touchedFields.confPassword}
                className={`transition-all duration-300 ${
                  !editMode 
                    ? theme === "dark"
                      ? "text-slate-500 bg-slate-900/50 border-slate-800 opacity-60"
                      : "text-gray-500 bg-gray-100/70 border-gray-300/50 opacity-70"
                    : theme === "dark" 
                      ? "text-white bg-slate-800 border-slate-700" 
                      : "text-gray-900 bg-white border-gray-300"
                }`}
                description="Confirm your new password"
              />
            </div>
            {passwordError && (
              <div className="text-sm text-red-600 mt-2">{passwordError}</div>
            )}
          </section>
          <Separator />

          {/* Commented out 2FA functionality as per requirements 3.1, 5.4 */}
          {/* 
          <section>
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-5 h-5 text-purple-400" />
              <h3
                className={`font-semibold text-lg ${
                  theme === "dark" ? "text-white" : "text-gray-800"
                }`}
              >
                Setup Two Factor Auth (2FA)
              </h3>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span
                className={
                  theme === "dark" ? "text-slate-200" : "text-gray-900"
                }
              >
                Enable 2FA
              </span>
              <Switch
                checked={twoFA}
                onCheckedChange={setTwoFA}
                disabled={!editMode}
              />
            </div>
          </section>
          */}
        </CardContent>
        <CardFooter className="justify-end gap-3 pt-2">
          {/* Only show Save Changes button when in edit mode */}
          {editMode && (
            <Button
              type="submit"
              className="px-7 bg-teal-700 hover:bg-teal-800"
            >
              Save Changes
            </Button>
          )}
        </CardFooter>
      </form>
      {/* Team Members Table - Commented out as requested */}
      {/* 
      <div className="px-6 pb-8">
        <h3
          className={`font-semibold text-lg mt-6 mb-2 ${theme === "dark" ? "text-white" : "text-gray-800"
            }`}
        >
          Team Members
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(editMode ? pendingMembers : members).map((member, idx) => {
              const isOwner = member.role === "Owner";
              return (
                <TableRow key={member.name + idx}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell className="capitalize">
                    {isOwner ? (
                      <span>Owner</span>
                    ) : editMode ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleMemberRoleChange(
                            idx,
                            value as "can edit" | "can view"
                          )
                        }
                        disabled={isOwner || !editMode}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="can edit">can edit</SelectItem>
                          <SelectItem value="can view">can view</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{member.role}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isOwner && editMode && (
                      <button
                        aria-label="Delete Member"
                        type="button"
                        className="text-red-600 hover:bg-red-50 rounded-full p-1 transition"
                        onClick={() => handleDeleteMember(idx)}
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      */}
      {/* Removed InviteTeamModal */}
      <Dialog
        open={isPasswordConfirmOpen}
        onOpenChange={setIsPasswordConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Password Change</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to update your password?
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPasswordSave}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              Yes, Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
