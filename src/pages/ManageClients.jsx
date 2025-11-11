import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaSearch, FaPlus, FaFileContract } from "react-icons/fa";
import EditClient from "../components/EditClient";
import AddClient from "../components/AddClient";
import ManageProjects from "../components/ManageProjects";
import GenerateDocModal from "../components/GenerateDocModal";
import ManageAdmins from "../components/ManageAdmins";
import API from "../api/config";
import { ClipLoader } from "react-spinners";

const ITEMS_PER_PAGE = 50;

const ManageClients = () => {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState("");
    const [editingClient, setEditingClient] = useState(null);
    const [expandedClient, setExpandedClient] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [selectedCompanyName, setSelectedCompanyName] = useState(null);
    const [loadingCompanyId, setLoadingCompanyId] = useState(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [docType, setDocType] = useState("SOW");

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem("token");

            const [clientRes, adminRes] = await Promise.all([
                axios.get(API.FETCH_MANAGE_CLIENTS, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(API.GET_ALL_COMPANY_ADMINS, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const adminMap = {};
            const admins = Array.isArray(adminRes.data?.data)
                ? adminRes.data.data
                : Array.isArray(adminRes.data)
                    ? adminRes.data
                    : [];

            for (const row of admins) {
                if (!adminMap[row.company_id]) adminMap[row.company_id] = [];
                adminMap[row.company_id].push({
                    usn: row.kash_operations_usn,
                    role: row.role || "Admin",
                    full_name: row.full_name || row.kash_operations_usn,
                });
            }

            const safeClients = Array.isArray(clientRes.data?.data)
                ? clientRes.data.data
                : Array.isArray(clientRes.data)
                    ? clientRes.data
                    : [];

            const enrichedClients = safeClients.map((client) => ({
                ...client,
                admins: Array.isArray(adminMap[client.company_id])
                    ? adminMap[client.company_id]
                    : [],
                projects: Array.isArray(client.projects)
                    ? client.projects
                    : typeof client.projects === "object" && client.projects !== null
                        ? Object.values(client.projects)
                        : [],
            }));

            setClients(enrichedClients);
        } catch (err) {
            console.error("❌ Error fetching clients:", err);
        }
    };

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedClients = [...clients].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        return typeof aVal === "string"
            ? sortConfig.direction === "asc"
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal)
            : sortConfig.direction === "asc"
                ? aVal - bVal
                : bVal - aVal;
    });

    const filteredClients = sortedClients.filter((c) =>
        c?.company_name?.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleManageProjects = (companyId, companyName) => {
        setSelectedCompanyId(companyId);
        setSelectedCompanyName(companyName);
        setShowProjectModal(true);
    };

    const handleManageAdmins = (companyId, companyName) => {
        setSelectedCompanyId(companyId);
        setSelectedCompanyName(companyName);
        setShowAdminModal(true);
    };

    const openGenerateModal = (client, type) => {
        setSelectedClient(client);
        setDocType(type);
        setShowGenerateModal(true);
    };

    return (
        <div className="p-6 relative">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-purple-900 dark:text-white">Manage Clients</h1>
                <button
                    className="bg-orange-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-orange-600 text-sm flex items-center gap-2"
                    onClick={() => setShowAddModal(true)}
                >
                    <FaPlus /> Add Client
                </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className="relative w-72">
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Clients"
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-full text-sm dark:bg-[#2b2b3c] dark:text-white dark:border-gray-500"
                    />
                </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full text-sm">
                    <thead className="bg-purple-100 dark:bg-purple-800 text-gray-800 dark:text-white">
                        <tr>
                            <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("company_name")}>Company Name</th>
                            <th className="p-3 text-center cursor-pointer" onClick={() => handleSort("company_id")}>Company ID</th>
                            <th className="p-3 text-center cursor-pointer" onClick={() => handleSort("industry")}>Industry</th>
                            <th className="p-3 text-center">Active/Total Projects</th>
                            <th className="p-3 text-center">Actions</th>
                            <th className="p-3 text-center">Details</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-white">
                        {paginatedClients.map((client) => {
                            const isExpanded = expandedClient?.company_id === client.company_id;
                            return (
                                <React.Fragment key={client.company_id}>
                                    <tr className="border-t">
                                        <td className="p-3">{client.company_name}</td>
                                        <td className="p-3 text-center">{client.company_id}</td>
                                        <td className="p-3 text-center">{client.industry || "N/A"}</td>
                                        <td className="p-3 text-center">{client.active_projects} / {client.total_projects}</td>
                                        <td className="p-3 text-center flex flex-col items-center gap-2">
                                            <button
                                                onClick={() => setEditingClient(client)}
                                                className="text-xs flex items-center gap-1 text-purple-700 hover:text-white"
                                            >
                                                <FaEdit /> Edit
                                            </button>
                                            <button
                                                onClick={() => openGenerateModal(client, "SOW")}
                                                className="text-xs flex items-center gap-1 text-green-600 hover:text-green-300"
                                                disabled={loadingCompanyId === client.company_id}
                                            >
                                                {loadingCompanyId === client.company_id ? (
                                                    <><ClipLoader size={16} color="#22c55e" /> Generating...</>
                                                ) : (
                                                    <><FaFileContract /> Generate SOW</>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openGenerateModal(client, "MSA")}
                                                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-200"
                                            >
                                                <FaFileContract /> Generate MSA
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => setExpandedClient(isExpanded ? null : client)}
                                                className="text-xs text-purple-700 hover:text-white flex items-center gap-1"
                                            >
                                                {isExpanded ? "− Less Info" : "+ More Info"}
                                            </button>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-purple-50 dark:bg-[#2b2b3c] text-sm">
                                            <td colSpan="6" className="p-4">
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div className="col-span-1 bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                                                        <h4 className="font-semibold mb-2 text-purple-900 dark:text-white">Address</h4>
                                                        <p className="text-gray-700 dark:text-gray-300">
                                                            {client.address_line1 || "N/A"}{client.address_line2 && `, ${client.address_line2}`}<br />
                                                            {client.city || ""}, {client.state || ""}<br />
                                                            {client.country || ""} - {client.zipcode || ""}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-1 bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-semibold text-purple-900 dark:text-white">Admins</h4>
                                                            <button
                                                                onClick={() => handleManageAdmins(client.company_id, client.company_name)}
                                                                className="text-xs bg-purple-800 text-white px-3 py-1 rounded-full hover:bg-purple-900"
                                                            >
                                                                Manage Admins
                                                            </button>
                                                        </div>
                                                        {Array.isArray(client.admins) && client.admins.length ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {client.admins.map((admin, idx) => (
                                                                    <span key={idx} className="px-3 py-1 bg-purple-200 text-purple-900 rounded-full text-xs">
                                                                        {admin.full_name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500">N/A</p>
                                                        )}

                                                    </div>
                                                    <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-semibold text-purple-900 dark:text-white">Projects</h4>
                                                            <button
                                                                onClick={() => handleManageProjects(client.company_id, client.company_name)}
                                                                className="text-xs bg-purple-800 text-white px-3 py-1 rounded-full hover:bg-purple-900"
                                                            >
                                                                Manage Projects
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Array.isArray(client.projects) ? (
                                                                client.projects.length > 0 ? (
                                                                    client.projects.map((proj, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className={`px-3 py-1 text-xs rounded-full ${proj.status?.toLowerCase() === "active"
                                                                                ? "bg-purple-200 text-purple-900 dark:bg-purple-700 dark:text-white"
                                                                                : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-white"
                                                                                }`}
                                                                        >
                                                                            {proj.name}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-gray-500">No Projects</p>
                                                                )
                                                            ) : (
                                                                <>
                                                                    {console.warn("⚠️ client.projects is not an array:", client.projects)}
                                                                    <p className="text-red-500 text-xs">Invalid project data</p>
                                                                </>
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

            <div className="flex justify-between mt-4 items-center">
                <p className="text-sm text-gray-600 dark:text-white">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50">
                        Previous
                    </button>
                    <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50">
                        Next
                    </button>
                </div>
            </div>

            {editingClient && (
                <EditClient
                    client={editingClient}
                    onClose={() => setEditingClient(null)}
                    onUpdate={() => {
                        fetchClients();
                        setEditingClient(null);
                    }}
                />
            )}

            {showAddModal && (
                <AddClient
                    onClose={() => setShowAddModal(false)}
                    onAdd={() => {
                        setShowAddModal(false);
                        fetchClients();
                    }}
                />
            )}

            {showProjectModal && (
                <ManageProjects
                    companyId={selectedCompanyId}
                    companyName={selectedCompanyName}
                    onClose={() => {
                        setShowProjectModal(false);
                        fetchClients(); // ✅ Refresh grid after modal closes
                    }}
                />
            )}


            {showAdminModal && (
                <ManageAdmins
                    companyId={selectedCompanyId}
                    companyName={selectedCompanyName}
                    onClose={() => {
                        setShowAdminModal(false);
                        fetchClients(); // ✅ Refresh grid when modal closes
                    }}
                />
            )}


            {showGenerateModal && selectedClient && (
                <GenerateDocModal
                    client={selectedClient}
                    docType={docType}
                    onClose={() => setShowGenerateModal(false)}
                />
            )}

        </div>
    );
};

export default ManageClients;
