import { useState } from "react";
import { Plus, Upload, FileText, Link, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme/ThemeProvider";
import { toast } from "sonner";

type FormField = {
  name: string;
  type: string;
  required: boolean;
};

const Integrations = () => {
  const { theme } = useTheme();
  const [showDataModal, setShowDataModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [dataUploadType, setDataUploadType] = useState("");

  // New state for enhanced Add Lead form
  const [newLeadData, setNewLeadData] = useState({
    name: "",
    email: "",
    phone: "",
    leadType: "",
    leadTag: "",
    agent: "",
    businessType: "",
    engagementLevel: "",
    intentLevel: "",
    budgetConstraint: "",
    timelineUrgency: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fields: [
      {
        name: "",
        type: "text",
        required: true,
      },
    ],
  });
  const handleDataUpload = () => {
    if (!selectedAgent || !dataUploadType) {
      toast.error("Please select agent and upload type");
      return;
    }
    toast.success(`Data uploaded to ${selectedAgent} successfully`);
    setShowDataModal(false);
    setSelectedAgent("");
    setDataUploadType("");
  };
  const handleFormCreate = () => {
    if (!formData.title || !selectedAgent) {
      toast.error("Please fill in form title and select agent");
      return;
    }
    toast.success(`Form "${formData.title}" created for ${selectedAgent}`);
    setShowFormModal(false);
    setFormData({
      title: "",
      description: "",
      fields: [
        {
          name: "",
          type: "text",
          required: true,
        },
      ],
    });
    setSelectedAgent("");
  };
  const handleAddLead = () => {
    if (!newLeadData.name || !newLeadData.email || !newLeadData.leadType) {
      toast.error("Please fill in required fields");
      return;
    }
    toast.success(`Lead "${newLeadData.name}" added successfully`);
    setShowAddLeadModal(false);
    setNewLeadData({
      name: "",
      email: "",
      phone: "",
      leadType: "",
      leadTag: "",
      agent: "",
      businessType: "",
      engagementLevel: "",
      intentLevel: "",
      budgetConstraint: "",
      timelineUrgency: "",
    });
  };
  const addFormField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          name: "",
          type: "text",
          required: true,
        },
      ],
    }));
  };
  const updateFormField = (index: number, field: FormField) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? field : f)),
    }));
  };
  const removeFormField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };
  const downloadSampleTemplate = () => {
    const sampleData = [
      [
        "Name",
        "Email",
        "Phone",
        "Lead Type",
        "Lead Tag",
        "Business Type",
        "Engagement Level",
        "Intent Level",
        "Budget Constraint",
        "Timeline Urgency",
      ],
      [
        "John Doe",
        "john@example.com",
        "+1234567890",
        "Inbound",
        "Hot",
        "SaaS",
        "High",
        "High",
        "Medium",
        "High",
      ],
      [
        "Jane Smith",
        "jane@example.com",
        "+0987654321",
        "Outbound",
        "Warm",
        "E-commerce",
        "Medium",
        "Medium",
        "High",
        "Medium",
      ],
      [
        "Mike Johnson",
        "mike@example.com",
        "+1122334455",
        "Customer",
        "Cold",
        "Fintech",
        "Low",
        "Low",
        "Low",
        "Low",
      ],
    ];
    const csvContent = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead_data_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Sample template downloaded successfully");
  };
  return (
    <div
      className={`p-6 space-y-6 ${
        theme === "dark" ? "bg-black" : "bg-gray-50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Integrations
          </h1>
          <p
            className={`mt-2 ${
              theme === "dark" ? "text-slate-400" : "text-gray-600"
            }`}
          >
            Connect your favorite tools and platforms to SniperThink
          </p>
        </div>

        {/* Add Lead/Customer Button */}
        <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead/Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Lead Name *
                  </label>
                  <Input
                    placeholder="Enter lead name"
                    value={newLeadData.name}
                    onChange={(e) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newLeadData.email}
                    onChange={(e) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Phone Number
                  </label>
                  <Input
                    placeholder="Enter phone number"
                    value={newLeadData.phone}
                    onChange={(e) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Lead Type *
                  </label>
                  <Select
                    value={newLeadData.leadType}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        leadType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inbound">Inbound</SelectItem>
                      <SelectItem value="Outbound">Outbound</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Lead Tag
                  </label>
                  <Select
                    value={newLeadData.leadTag}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        leadTag: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hot">Hot</SelectItem>
                      <SelectItem value="Warm">Warm</SelectItem>
                      <SelectItem value="Cold">Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Agent
                  </label>
                  <Select
                    value={newLeadData.agent}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        agent: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chat Agent">Chat Agent</SelectItem>
                      <SelectItem value="Call Agent">Call Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Business Type
                  </label>
                  <Select
                    value={newLeadData.businessType}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        businessType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SaaS">SaaS</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="Fintech">Fintech</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Engagement Level
                  </label>
                  <Select
                    value={newLeadData.engagementLevel}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        engagementLevel: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select engagement level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Intent Level
                  </label>
                  <Select
                    value={newLeadData.intentLevel}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        intentLevel: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select intent level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Budget Constraint
                  </label>
                  <Select
                    value={newLeadData.budgetConstraint}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        budgetConstraint: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget constraint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Timeline Urgency
                  </label>
                  <Select
                    value={newLeadData.timelineUrgency}
                    onValueChange={(value) =>
                      setNewLeadData((prev) => ({
                        ...prev,
                        timelineUrgency: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeline urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Upload Container */}
              <div className="mt-6">
                <label className="text-sm font-medium mb-2 block">
                  Upload Data
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center ${
                    theme === "dark"
                      ? "border-gray-600 bg-gray-700/50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <Upload
                    className={`w-8 h-8 mx-auto mb-2 ${
                      theme === "dark" ? "text-slate-400" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-300" : "text-gray-600"
                    }`}
                  >
                    Drag and drop your Excel/CSV file here or click to browse
                  </p>
                  <Button variant="outline" size="sm" className="mb-3">
                    Browse Files
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddLeadModal(false)}
                  className={
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-slate-300 hover:bg-gray-600"
                      : ""
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddLead}
                  style={{
                    backgroundColor: "#1A6262",
                  }}
                  className="hover:opacity-90 text-white"
                >
                  Save Lead
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Data Collection Section */}
      <div>
        <h2
          className={`text-lg font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          Data Collection & Forms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <Upload className="w-6 h-6 text-blue-500" />
              <div>
                <h3
                  className={`font-medium ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Add Lead/Customer
                </h3>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  Individual or bulk data upload
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowDataModal(true)}
              className="w-full bg-[#374151] hover:bg-[#4B5563] text-[#CBD5E1]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Data
            </Button>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <FileText className="w-6 h-6 text-green-500" />
              <div>
                <h3
                  className={`font-medium ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Create Form
                </h3>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  Build custom data collection forms
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowFormModal(true)}
              className="w-full bg-[#374151] hover:bg-[#4B5563] text-[#CBD5E1]"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Form
            </Button>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <Link className="w-6 h-6 text-purple-500" />
              <div>
                <h3
                  className={`font-medium ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Integrate Form
                </h3>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  Connect existing Google Forms
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className={`w-full ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-slate-300 hover:bg-gray-600"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Link className="w-4 h-4 mr-2" />
              Link Form
            </Button>
          </div>
        </div>
      </div>

      {/* Data Upload Modal */}
      <Dialog open={showDataModal} onOpenChange={setShowDataModal}>
        <DialogContent
          className={`max-w-lg ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`flex items-center ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Data
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label
                className={`text-sm mb-2 block ${
                  theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Select Agent
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              >
                <option value="">Choose Agent</option>
                <option value="Chat Agent">Chat Agent</option>
                <option value="Call Agent">Call Agent</option>
              </select>
            </div>

            <div>
              <label
                className={`text-sm mb-2 block ${
                  theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Upload Type
              </label>
              <select
                value={dataUploadType}
                onChange={(e) => setDataUploadType(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              >
                <option value="">Choose Type</option>
                <option value="Individual Contact">Individual Contact</option>
                <option value="Bulk Upload">Bulk Upload (Excel)</option>
                <option value="CSV Import">CSV Import</option>
              </select>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                theme === "dark"
                  ? "border-gray-600 bg-gray-700/50"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              <Upload
                className={`w-8 h-8 mx-auto mb-2 ${
                  theme === "dark" ? "text-slate-400" : "text-gray-400"
                }`}
              />
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-slate-300" : "text-gray-600"
                }`}
              >
                Drag and drop files here or
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Browse Files
              </Button>
            </div>
            <a
              onClick={downloadSampleTemplate}
              className="text-blue-600 underline text-sm mt-2 block text-left cursor-pointer"
              style={{ minWidth: 120 }}
            >
              Download Template
            </a>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDataModal(false)}
                className={
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-slate-300 hover:bg-gray-600"
                    : ""
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleDataUpload}
                className="bg-[#374151] hover:bg-[#4B5563] text-[#CBD5E1]"
              >
                Upload Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Creation Modal */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent
          className={`max-w-2xl ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`flex items-center ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              <FileText className="w-5 h-5 mr-2" />
              Create Data Collection Form
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
            <div>
              <label
                className={`text-sm mb-2 block ${
                  theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Select Agent
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              >
                <option value="">Choose Agent</option>
                <option value="Chat Agent">Chat Agent</option>
                <option value="Call Agent">Call Agent</option>
              </select>
            </div>

            <div>
              <label
                className={`text-sm mb-2 block ${
                  theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Form Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className={`w-full rounded-lg px-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
                placeholder="Enter form title"
              />
            </div>

            <div>
              <label
                className={`text-sm mb-2 block ${
                  theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
              >
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className={`w-full rounded-lg px-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
                placeholder="Enter form description"
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }`}
                >
                  Form Fields
                </label>
                <Button
                  size="sm"
                  onClick={addFormField}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {formData.fields.map((field, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    theme === "dark"
                      ? "border-gray-600 bg-gray-700/50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        updateFormField(index, {
                          ...field,
                          name: e.target.value,
                        })
                      }
                      className={`rounded px-2 py-1 text-sm border ${
                        theme === "dark"
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300 text-black"
                      }`}
                      placeholder="Field name"
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateFormField(index, {
                          ...field,
                          type: e.target.value,
                        })
                      }
                      className={`rounded px-2 py-1 text-sm border ${
                        theme === "dark"
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="number">Number</option>
                      <option value="textarea">Textarea</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateFormField(index, {
                            ...field,
                            required: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Required
                    </label>
                    {formData.fields.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFormField(index)}
                        className="text-red-500 border-red-500 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowFormModal(false)}
                className={
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-slate-300 hover:bg-gray-600"
                    : ""
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleFormCreate}
                className="bg-[#374151] hover:bg-[#4B5563] text-[#CBD5E1]"
              >
                Create Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Integrations;
