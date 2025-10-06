import React, { useEffect, useState } from "react";
import axios from "axios";
import API from "../api/config";
import { FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import InvoiceModal from "../components/InvoiceModal";
import EditInvoiceModal from "../components/EditInvoiceModal";

import dayjs from "dayjs";

const ManageInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [search, setSearch] = useState("");
   
    const [sortField, setSortField] = useState(null);
    const [sortOrder, setSortOrder] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;
    const token = localStorage.getItem("token");

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);


    useEffect(() => {
        fetchInvoices();
        fetchDropdownData();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await axios.get(API.FETCH_ALL_INVOICES, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // ✅ Defensive check
            const invoiceArray = Array.isArray(res.data) ? res.data : [];
            setInvoices(invoiceArray);
        } catch (err) {
            console.error("❌ Failed to fetch invoices:", err);
        }
    };


    const fetchDropdownData = async () => {
        try {
            const [companyRes, roleRes] = await Promise.all([
                axios.get(API.GET_ALL_COMPANIES, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(API.FETCH_ROLES, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setCompanies(Array.isArray(companyRes.data) ? companyRes.data : []);
            setRoles(Array.isArray(roleRes.data) ? roleRes.data : []);

        } catch (error) {
            console.error("Error loading dropdowns", error);
        }
    };

    const handleCompanyChange = async (companyId) => {
        try {
            setProjects([]);
            setEmployees([]);
            if (!companyId) return;
            const res = await axios.get(API.GET_PROJECTS_BY_COMPANY_INVOICE(companyId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProjects(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("❌ Failed to load projects:", err);
        }
    };

    const handleProjectChange = async (sowId) => {
        try {
            setEmployees([]);
            if (!sowId) return;
            const res = await axios.get(API.GET_EMPLOYEES_BY_PROJECT(sowId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEmployees(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("❌ Failed to load employees:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this invoice?")) return;
        try {
            await axios.delete(API.DELETE_INVOICE(id), {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchInvoices();
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const getStatus = (dueDate) => {
        const today = dayjs();
        const due = dayjs(dueDate);
        if (due.isSame(today, "day")) return { text: "Due today", color: "text-orange-500" };
        if (due.isSame(today.add(1, "day"), "day")) return { text: "Due tomorrow", color: "text-orange-400" };
        if (due.isBefore(today)) return { text: "Overdue", color: "text-red-600" };
        return { text: "Paid", color: "text-green-600" };
    };

    const handleSort = (field) => {
        const order = sortField === field && sortOrder === "asc" ? "desc" : "asc";
        setSortField(field);
        setSortOrder(order);
    };

    const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter((inv) =>
        inv.company_name?.toLowerCase().includes(search.toLowerCase())
    );

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
        if (!sortField) return 0;
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "string") {
            return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortOrder === "asc" ? valA - valB : valB - valA;
        }
    });

    const totalPages = Math.ceil(sortedInvoices.length / rowsPerPage);
    const paginatedInvoices = sortedInvoices.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    return (
        <div className="p-6 relative">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-purple-900 dark:text-white">Manage Invoices</h1>
                <button
                    className="bg-orange-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-orange-600 text-sm flex items-center gap-2"
                    onClick={() => {
                        setSelectedInvoice(null); // Clear any previously selected invoice
                        setShowEditModal(true);       // This will open the Add InvoiceModal
                    }}
                >
                    <FaPlus /> Add Invoice
                </button>


            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className="relative w-72">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Search Invoice"
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-full text-sm dark:bg-[#2b2b3c] dark:text-white dark:border-gray-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full text-sm">
                    <thead className="bg-purple-100 dark:bg-purple-800 text-gray-800 dark:text-white">
                        <tr>
                            <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("company_id")}>Company</th>
                            <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("project_name")}>Project</th>
                            <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("invoice_period_start")}>Start Date - End Date</th>
                            <th className="p-3 text-right cursor-pointer" onClick={() => handleSort("grand_total")}>Amount</th>
                            <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("due_date")}>Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-white">
                        {(Array.isArray(paginatedInvoices) ? paginatedInvoices : []).map((inv, index) => {
                            const status = getStatus(inv.due_date);
                            const key = `${inv.invoice_id}-${inv.company_id}-${index}`;
                            return (
                                <tr key={key} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="p-3">{inv.company_name || inv.company_id}</td>
                                    <td className="p-3">{inv.project_name || "—"}</td>
                                    <td className="p-3">{dayjs(inv.invoice_period_start).format("DD MMM YYYY")} - {dayjs(inv.invoice_period_end).format("DD MMM YYYY")}</td>
                                    <td className="p-3 text-right">${parseFloat(inv.grand_total || 0).toFixed(2)}</td>
                                    <td className={`p-3 font-semibold ${status.color}`}>• {status.text}</td>
                                    <td className="p-3 text-center flex gap-2 justify-center">
                                        <button
                                            className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1"
                                            onClick={() => {
                                                setSelectedInvoice(inv);
                                                setTimeout(() => setShowEditModal(true), 0);
                                            }}
                                        >
                                            <FaEdit /> Edit
                                        </button>

                                        <button
                                            className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                                            onClick={() => handleDelete(inv.invoice_id)}
                                        >
                                            <FaTrash /> Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginatedInvoices.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center py-4 text-gray-500">No invoices found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                <div>Page {currentPage} of {totalPages}</div>
                <div className="flex gap-4">
                    <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="text-purple-700 disabled:text-gray-400">Previous</button>
                    <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="text-purple-700 disabled:text-gray-400">Next</button>
                </div>
            </div>

            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-5">
                    <div className="bg-white rounded-lg shadow-lg w-[95%] h-[95%] overflow-y-auto relative">
                        <button
                            className="absolute top-3 right-4 text-xl text-gray-600 hover:text-black"
                            onClick={() => setShowEditModal(false)}
                        >
                            &times;
                        </button>

                        {selectedInvoice ? (
                            <EditInvoiceModal
                                invoice={selectedInvoice}
                                onClose={() => {
                                    setSelectedInvoice(null);
                                    setShowEditModal(false);
                                }}
                                onInvoiceUpdated={() => {
                                    fetchInvoices();        // ✅ Fetch fresh data
                                    setShowEditModal(false);    // ✅ Close modal after update
                                    setSelectedInvoice(null);
                                }}
                                companies={companies}
                                projects={projects}
                                onCompanyChange={handleCompanyChange}
                            />
                        ) : (

                            <InvoiceModal
                                onClose={() => setShowEditModal(false)}
                                onInvoiceSaved={() => {
                                    fetchInvoices();         // 🔄 Refresh invoice list
                                    setShowEditModal(false);     // ✅ Close modal
                                }}
                                companies={companies}
                                projects={projects}
                                onCompanyChange={handleCompanyChange}
                            />


                        )}
                    </div>
                </div>
            )}



        </div>
    );
};

export default ManageInvoices;
