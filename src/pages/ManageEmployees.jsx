import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaSearch, FaPlus } from "react-icons/fa";
import EditEmployee from "../components/EditEmployee";
import AddEmployee from "../components/AddEmployee"; // 🆕 new component
import API from "../api/config";

const ITEMS_PER_PAGE = 50;

const ManageEmployees = () => {
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [showAddModal, setShowAddModal] = useState(false); // 🆕

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(API.FETCH_ALL_EMPLOYEES, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEmployees(res.data);
        } catch (err) {
            console.error("Error fetching employees", err);
        }
    };

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedEmployees = [...employees].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";
        return typeof aValue === "string"
            ? (sortConfig.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue))
            : (sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue);
    });

    const filteredEmployees = sortedEmployees.filter((emp) =>
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-purple-900 dark:text-white">Manage Employee</h1>
                <button
                    className="bg-orange-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-orange-600 text-sm flex items-center gap-2"
                    onClick={() => setShowAddModal(true)}
                >
                    <FaPlus /> Add Employee
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-4 mb-4">
                <div className="relative w-72">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Employee"
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-full text-sm dark:bg-[#2b2b3c] dark:text-white dark:border-gray-500"
                    />
                </div>
            </div>

            {/* Employee Table */}
            <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full text-sm">
                    <thead className="bg-purple-100 dark:bg-purple-800 text-gray-800 dark:text-white">
                        <tr>
                            <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("first_name")}>Name</th>
                            <th className="p-3 text-center cursor-pointer" onClick={() => handleSort("emp_id")}>Employee ID</th>
                            <th className="p-3 text-center cursor-pointer" onClick={() => handleSort("employee_type")}>Contractor Type</th>
                            <th className="p-3 text-center cursor-pointer" onClick={() => handleSort("employee_status")}>Status</th>
                            <th className="p-3 text-center">Action</th>
                            <th className="p-3 text-center">Details</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-white">
                        {paginatedEmployees.map((emp, idx) => {
                            const isExpanded = expandedEmployee?.emp_id === emp.emp_id;

                            return (
                                <React.Fragment key={emp.emp_id || idx}>
                                    <tr className="border-t">
                                        <td className="p-3 text-left">{emp.first_name} {emp.last_name}</td>
                                        <td className="p-3 text-center">{emp.emp_id}</td>
                                        <td className="p-3 text-center">{emp.employee_type || "N/A"}</td>
                                        <td className="p-3 text-center">
                                            {emp.employee_status?.toLowerCase() === "inactive" ? (
                                                <span className="text-red-500 flex items-center justify-center gap-1">🔴 Inactive</span>
                                            ) : emp.employee_status?.toLowerCase() === "on leave" ? (
                                                <span className="text-yellow-500 flex items-center justify-center gap-1">🟠 On Leave</span>
                                            ) : (
                                                <span className="text-green-600 flex items-center justify-center gap-1">🟢 Active</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => setEditingEmployee(emp)}
                                                className="text-xs flex items-center gap-1 text-purple-700 hover:text-white"
                                            >
                                                <FaEdit /> Edit
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => setExpandedEmployee(isExpanded ? null : emp)}
                                                className="text-xs text-purple-700 hover:text-white flex items-center gap-1"
                                            >
                                                <span className="text-lg">{isExpanded ? "−" : "+"}</span> {isExpanded ? "Less Info" : "More Info"}
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded Row */}
                                    {isExpanded && (
                                        <tr className="bg-purple-50 dark:bg-[#2b2b3c] text-sm transition-all">
                                            <td colSpan="6" className="p-4">
                                                <div className="grid grid-cols-5 gap-4">
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border">
                                                        <h4 className="font-semibold text-purple-900 dark:text-white mb-2">Contact Information</h4>
                                                        <p className="text-xs"><strong>Email:</strong> {emp.email_address}</p>
                                                        <p className="text-xs"><strong>Phone:</strong> {emp.phone_number}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border">
                                                        <h4 className="font-semibold text-purple-900 dark:text-white mb-2">Address</h4>
                                                        <p className="text-xs">{emp.employee_address}</p>
                                                        <p className="text-xs">{emp.employee_address_line2}</p>
                                                        <p className="text-xs">
                                                            {emp.emp_location_city}, {emp.emp_location_state}, {emp.employee_zip_code}
                                                        </p>
                                                        <p className="text-xs">{emp.emp_location_country}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border">
                                                        <h4 className="font-semibold text-purple-900 dark:text-white mb-2">Kash Op Info</h4>
                                                        <p className="text-xs"><strong>Username:</strong> {emp.kash_operations_usn}</p>
                                                        <p className="text-xs"><strong>Admin Level:</strong> {emp.admin_level}</p>
                                                    </div>
                                                    {/* Clients Section */}
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border">
                                                        <h4 className="font-semibold text-purple-900 dark:text-white mb-2">Clients</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {emp.assigned_clients?.length > 0 ? (
                                                                emp.assigned_clients.map((client) => (
                                                                    <span key={client.company_id} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                                                        {client.company_name}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-gray-500">No clients assigned</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Projects Section */}
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border">
                                                        <h4 className="font-semibold text-purple-900 dark:text-white mb-2">Projects</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {emp.assigned_projects?.length > 0 ? (
                                                                emp.assigned_projects.map((proj, idx) => (
                                                                    <span key={idx} className="bg-gray-200 dark:bg-gray-600 text-xs px-2 py-1 rounded-full">
                                                                        {proj.project_category}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-gray-500">No projects assigned</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between mt-4 items-center">
                <p className="text-sm text-gray-600 dark:text-white">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Edit Employee Modal */}
            {editingEmployee && (
                <EditEmployee
                    employee={editingEmployee}
                    onClose={() => setEditingEmployee(null)}
                    onUpdate={(updated) => {
                        if (!updated && editingEmployee) {
                            setEmployees((prev) => prev.filter((e) => e.emp_id !== editingEmployee.emp_id));
                        } else if (updated) {
                            setEmployees((prev) => prev.map((e) => (e.emp_id === updated.emp_id ? updated : e)));
                        }
                        setEditingEmployee(null);
                    }}
                />
            )}

            {/* Add Employee Modal */}
            {showAddModal && (
                <AddEmployee
                    onClose={() => setShowAddModal(false)}
                    onAdd={(newEmp) => {
                        setEmployees((prev) => [newEmp, ...prev]);
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default ManageEmployees;
