import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  MoreVertical, 
  UserPlus, 
  Mail, 
  Phone,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface AdminEmployeesProps {
  onBack: () => void;
}

interface Employee {
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  created_at: string;
}

const AdminEmployees = ({ onBack }: AdminEmployeesProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Employee | null>(null);
  const [newEmployeeData, setNewEmployeeData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "employee",
    password: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all employees from Supabase
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (role: string) => {
    return role === 'admin' 
      ? "bg-purple-100 text-purple-800 border-purple-200" 
      : "bg-blue-100 text-blue-800 border-blue-200";
  };

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      toast({
        title: "Employee Deleted",
        description: "Employee has been removed successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (error) => {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      });
    }
  });

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: typeof newEmployeeData) => {
      // Step 1: Create auth user with email confirmation disabled
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            name: data.name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Step 2: Generate employee_id
      const count = employees.length + 1;
      const employeeId = `EMP${String(count).padStart(3, '0')}`;

      // Step 3: Insert into employees table
      const { error: insertError } = await supabase
        .from('employees')
        .insert({
          user_id: authData.user.id,
          employee_id: employeeId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          role: data.role,
        });

      if (insertError) {
        // If employee insert fails, we should ideally delete the auth user
        // but for simplicity, we'll just throw the error
        throw insertError;
      }

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      toast({
        title: "Employee Added",
        description: "New employee has been created successfully",
      });
      setAddDialogOpen(false);
      setNewEmployeeData({
        name: "",
        email: "",
        phone: "",
        department: "",
        role: "employee",
        password: "",
      });
    },
    onError: (error: any) => {
      console.error("Error adding employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive"
      });
    }
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: Employee) => {
      const { error } = await supabase
        .from('employees')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          role: data.role,
        })
        .eq('employee_id', data.employee_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      toast({
        title: "Employee Updated",
        description: "Employee information has been updated successfully",
      });
      setEditDialogOpen(false);
      setEditFormData(null);
      setSelectedEmployee(null);
    },
    onError: (error) => {
      console.error("Error updating employee:", error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive"
      });
    }
  });

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setViewDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditFormData({ ...employee });
    setEditDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEmployee) {
      deleteEmployeeMutation.mutate(selectedEmployee.employee_id);
    }
  };

  const handleUpdateEmployee = () => {
    if (editFormData) {
      updateEmployeeMutation.mutate(editFormData);
    }
  };

  const handleAddEmployee = () => {
    // Validate required fields
    if (!newEmployeeData.name || !newEmployeeData.email || !newEmployeeData.password || !newEmployeeData.department) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployeeData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    // Validate password length
    if (newEmployeeData.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    addEmployeeMutation.mutate(newEmployeeData);
  };

  const handleEmployeeAction = (action: string, employee: Employee) => {
    toast({
      title: "Action Performed",
      description: `${action} action for ${employee.name}`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Employee Management</h1>
            <p className="text-muted-foreground">Manage your organization's workforce</p>
          </div>
        </div>
        <Button className="gradient-primary text-white" onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filter by Department</Button>
            <Button variant="outline">Filter by Status</Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{employees.length}</div>
            <div className="text-sm text-muted-foreground">Total Employees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {employees.filter(e => e.role === "employee").length}
            </div>
            <div className="text-sm text-muted-foreground">Employees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {employees.filter(e => e.role === "admin").length}
            </div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>
            {filteredEmployees.length} of {employees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading employees...</p>
            </div>
          )}
          
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.employee_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="gradient-primary text-white">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{employee.name}</h3>
                      <Badge variant="secondary" className="text-xs">{employee.employee_id}</Badge>
                      <Badge className={getStatusColor(employee.role)}>
                        {employee.role.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {employee.email}
                      </div>
                      {employee.phone && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {employee.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-muted-foreground">{employee.department}</span>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        Joined {new Date(employee.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewEmployee(employee)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Employee
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteEmployee(employee)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Employee
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account. The employee can log in immediately with the provided credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-name">Full Name *</Label>
                <Input
                  id="add-name"
                  value={newEmployeeData.name}
                  onChange={(e) => setNewEmployeeData({ ...newEmployeeData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="add-email">Email *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={newEmployeeData.email}
                  onChange={(e) => setNewEmployeeData({ ...newEmployeeData, email: e.target.value })}
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <Label htmlFor="add-password">Password *</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={newEmployeeData.password}
                  onChange={(e) => setNewEmployeeData({ ...newEmployeeData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  value={newEmployeeData.phone}
                  onChange={(e) => setNewEmployeeData({ ...newEmployeeData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <Label htmlFor="add-department">Department *</Label>
                <Input
                  id="add-department"
                  value={newEmployeeData.department}
                  onChange={(e) => setNewEmployeeData({ ...newEmployeeData, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>

              <div>
                <Label htmlFor="add-role">Role *</Label>
                <select
                  id="add-role"
                  value={newEmployeeData.role}
                  onChange={(e) => setNewEmployeeData({ ...newEmployeeData, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                <strong>Note:</strong> Employee ID will be auto-generated. The employee can log in immediately using their email and password.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddEmployee}
              disabled={addEmployeeMutation.isPending}
              className="gradient-primary text-white"
            >
              {addEmployeeMutation.isPending ? "Creating..." : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              Complete information about the employee
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="gradient-primary text-white text-2xl">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold">{selectedEmployee.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary">{selectedEmployee.employee_id}</Badge>
                    <Badge className={getStatusColor(selectedEmployee.role)}>
                      {selectedEmployee.role.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-medium">{selectedEmployee.email}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-medium">{selectedEmployee.phone || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Department</Label>
                  <p className="font-medium mt-1">{selectedEmployee.department}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Joined Date</Label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-medium">
                      {new Date(selectedEmployee.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          {editFormData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-employee-id">Employee ID</Label>
                  <Input
                    id="edit-employee-id"
                    value={editFormData.employee_id}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-department">Department *</Label>
                  <Input
                    id="edit-department"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    placeholder="Engineering"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-role">Role *</Label>
                  <select
                    id="edit-role"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateEmployee}
              disabled={updateEmployeeMutation.isPending}
              className="gradient-primary text-white"
            >
              {updateEmployeeMutation.isPending ? "Updating..." : "Update Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedEmployee?.name}</strong> ({selectedEmployee?.employee_id}) from the system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete Employee"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEmployees;