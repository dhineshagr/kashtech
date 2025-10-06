import React, { useEffect, useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import Select from "react-select";
import "react-datepicker/dist/react-datepicker.css";
import API from "../api/config";

const EditInvoiceModal = ({ invoice, onClose, onInvoiceUpdated }) => {
    const [companies, setCompanies] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(invoice.company_id);
    const [selectedProjects, setSelectedProjects] = useState([]);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [dueDate, setDueDate] = useState(null);
    const [taxRate, setTaxRate] = useState("");

    const [groupedData, setGroupedData] = useState({});
    const [expandedUser, setExpandedUser] = useState({});

    // add this useEffect below all your other useEffects:
    useEffect(() => {
        // whenever our groupedData changes, auto-expand all rows:
        const allExpanded = {};
        Object.entries(groupedData).forEach(([projectKey, rows]) => {
            rows.forEach(row => {
                const key = `${projectKey}_${row.emp_id}`;
                allExpanded[key] = true;
            });
        });
        setExpandedUser(allExpanded);
    }, [groupedData]);

    useEffect(() => {
        const fetchCompanies = async () => {
            const token = localStorage.getItem("token");
            const res = await axios.get(API.GET_ALL_COMPANIES_INVOICE, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCompanies(Array.isArray(res.data) ? res.data : []);
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        console.log("Invoice in EditInvoiceModal:", invoice);
        if (invoice) {
            const parseDate = (dateStr) => dateStr ? new Date(dateStr) : null;

            setStartDate(parseDate(invoice.invoice_period_start));
            setEndDate(parseDate(invoice.invoice_period_end));
            setDueDate(parseDate(invoice.due_date));
            setTaxRate(invoice.tax_rate || "");
            setSelectedCompany(invoice.company_id);
        }

    }, [invoice]);


    useEffect(() => {
        const fetchProjects = async () => {
            const token = localStorage.getItem("token");
            const res = await axios.get(API.GET_PROJECTS_BY_COMPANY_INVOICE(selectedCompany), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const projectData = Array.isArray(res.data) ? res.data : [];


            projectData.sort((a, b) =>
                a.project_name.localeCompare(b.project_name)
            );

            setProjects(projectData);

            const invoiceProjects = invoice.project_name?.split(",").map(p => p.trim()) || [];
            const selected = projectData
                .filter(p => invoiceProjects.includes(p.project_name))
                .map(p => ({ label: p.project_name, value: p.sow_id }));
            setSelectedProjects(selected);

        };

        if (selectedCompany) fetchProjects();
    }, [selectedCompany]);

    useEffect(() => {
        const fetchInvoiceDetails = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(API.FETCH_INVOICE_DETAILS_BY_ID(invoice.invoice_id), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const grouped = {};
                const details = Array.isArray(res.data) ? res.data : [];
                details.forEach(item => {
                    const key = item.project_name || "Project";
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(item);
                });

                setGroupedData(grouped);
            } catch (err) {
                console.error("❌ Failed to fetch invoice details:", err);
            }
        };

        if (invoice?.invoice_id) {
            fetchInvoiceDetails();
        }
    }, [invoice?.invoice_id]);


    const handleCompanyChange = (value) => {
        setSelectedCompany(value);
        setSelectedProjects([]);
        setGroupedData({});
    };

    // Inside EditInvoiceModal component

    const applyFilters = async () => {
        // 1️⃣ Validate required filters
        if (!selectedProjects.length || !startDate || !endDate) {
            alert("Please select Project(s), Start Date and End Date.");
            return;
        }

        const sowIds = selectedProjects.map(p => p.value);
        const token = localStorage.getItem("token");

        try {
            const res = await axios.get(API.GET_INVOICE_TIMESHEET_DATA, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    companyId: selectedCompany,
                    projectIds: sowIds.join(","),
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                }
            });

            // 2️⃣ Normalize and check for empty result
            const items = Array.isArray(res.data) ? res.data : [];
            if (items.length === 0) {
                alert("No data available for the selected period.");
                setGroupedData({});
                return;
            }

            // 3️⃣ Group and display the data
            const grouped = {};
            items.forEach(item => {
                const key = item.project_name || "Project";
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            });
            setGroupedData(grouped);

        } catch (err) {
            console.error("❌ Failed to fetch invoice data", err);
            alert("Error: " + (err.response?.data?.error || "Unable to load invoice data"));
        }
    };


    const handleRateChange = (projectKey, index, rate) => {
        const updated = { ...groupedData };
        updated[projectKey][index].rate = rate;
        setGroupedData(updated);
    };

    const calculateAmount = (hours, rate) => {
        return (parseFloat(hours || 0) * parseFloat(rate || 0)).toFixed(2);
    };

    const calculateProjectTotal = (rows) => {
        return rows.reduce((sum, row) => sum + parseFloat(row.hours || 0) * parseFloat(row.rate || 0), 0).toFixed(2);
    };

    const calculateInvoiceTotal = () => {
        const subtotal = Object.values(groupedData).flat().reduce((sum, row) => {
            return sum + parseFloat(row.hours || 0) * parseFloat(row.rate || 0);
        }, 0);
        const taxAmount = (subtotal * parseFloat(taxRate || 0)) / 100;
        return (subtotal + taxAmount).toFixed(2);
    };

    const toggleExpand = (projectKey, emp_id) => {
        const key = `${projectKey}_${emp_id}`;
        setExpandedUser((prev) => ({ ...prev, [key]: !prev[key] }));
    };



    const handleUpdate = async () => {
        // ✅ Validate: All rows must have valid rate and hours
        const invalidEntries = Object.values(groupedData).flat().filter(row => {
            return (
                !row.emp_id ||
                !row.sow_id ||
                isNaN(parseFloat(row.rate)) ||
                isNaN(parseFloat(row.hours)) ||
                parseFloat(row.rate) <= 0 ||
                parseFloat(row.hours) <= 0
            );
        });

        if (invalidEntries.length > 0) {
            alert("❌ Please ensure all rows have valid Rate and Hours before updating.");
            return;
        }

        // ✅ Build request payload
        const payload = {
            company_id: selectedCompany,
            invoice_period_start: startDate,
            invoice_period_end: endDate,
            due_date: dueDate,
            tax_rate: parseFloat(taxRate),
            grand_total: parseFloat(calculateInvoiceTotal()),
            details: Object.entries(groupedData).flatMap(([projectKey, rows]) =>
                rows.map(row => ({
                    emp_id: row.emp_id,
                    sow_id: row.sow_id,
                    rate: parseFloat(row.rate || 0),
                    total_hrs: parseFloat(row.hours || 0),
                    amount: parseFloat(calculateAmount(row.hours, row.rate)),
                    resource_role: row.role,
                    sub_assignment_title: row.work_area || null,
                    sub_assignment_segment_1: row.task_area || null
                }))
            )
        };

        if (payload.details.length === 0) {
            alert("❌ Invoice must include at least one employee/project entry.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.put(API.UPDATE_INVOICE(invoice.invoice_id), payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            alert("✅ Invoice updated successfully!");

            // 🔁 Trigger parent to refresh and close modal
            if (typeof onInvoiceUpdated === "function") {
                onInvoiceUpdated(); // fetchInvoices + close modal in parent
            }

        } catch (err) {
            console.error("❌ Error updating invoice:", err);
            alert("Failed to update invoice: " + (err.response?.data?.error || err.message));
        }
    };




    return (
        <div className="p-6 bg-white min-h-screen">
            <h2 className="text-xl font-bold text-purple-900 mb-4">Edit Invoice #{invoice.invoice_num}</h2>

            <div className="grid grid-cols-1 gap-4 mb-6">

                <div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Company</label>
                        <select className="w-full border rounded px-3 py-2" value={selectedCompany} onChange={(e) => handleCompanyChange(e.target.value)}>
                            <option value="">Select Company</option>
                            {companies.map((c) => (
                                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-3">
                        <label className="block text-sm font-semibold mb-1">Project</label>
                        <Select
                            isMulti
                            options={projects.map((p) => ({
                                label: `${p.project_name}`,
                                value: p.sow_id,
                            }))}
                            value={selectedProjects}
                            onChange={(opts) => setSelectedProjects(opts)}
                        />
                    </div>

                    <div className="flex gap-2 pt-3">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Start Date</label>
                            <DatePicker selected={startDate} onChange={setStartDate} className="border px-2 py-1 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">End Date</label>
                            <DatePicker selected={endDate} onChange={setEndDate} className="border px-2 py-1 rounded" />
                        </div>

                    </div>

                    <div className="flex justify-end items-end pt-3">
                        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={applyFilters}>Apply Filters</button>
                    </div>

                </div>

            </div>

            <div className="space-y-6">
                {Object.entries(groupedData).map(([projectKey, rows]) => {
                    const groupedByUser = rows.reduce((acc, row) => {
                        const userKey = `${row.emp_id}_${row.first_name}_${row.last_name}`;
                        if (!acc[userKey]) acc[userKey] = [];
                        acc[userKey].push(row);
                        return acc;
                    }, {});
                    return (
                        <div key={projectKey} className="bg-white rounded shadow p-4">
                            <h3 className="font-bold text-gray-700 text-lg mb-4">{projectKey}</h3>
                            {Object.entries(groupedByUser).map(([userKey, userRows]) => {
                                const [emp_id, first, last] = userKey.split("_");
                                const fullKey = `${projectKey}_${emp_id}`;
                                return (
                                    <div key={userKey} className="mb-2">
                                        <div
                                            onClick={() => toggleExpand(projectKey, emp_id)}
                                            className="cursor-pointer bg-gray-100 px-4 py-2 rounded font-medium hover:bg-gray-200 flex justify-between"
                                        >
                                            <span>{`${first} ${last}`}</span>
                                            <span>{userRows[0].role}</span>
                                        </div>
                                        {expandedUser[fullKey] && (
                                            <div className="mt-2 space-y-2">
                                                <div className="grid grid-cols-7 text-sm font-bold px-2">
                                                    <div>Name</div>
                                                    <div>Work Area</div>
                                                    <div>Task</div>
                                                    <div>Role</div>
                                                    <div>Hours</div>
                                                    <div>Rate (/hr)</div>
                                                    <div>Amount</div>
                                                </div>
                                                {userRows.map((row, rowIndex) => (
                                                    <div key={rowIndex} className="grid grid-cols-7 text-sm items-center px-2 border-b py-1">
                                                        <div>{row.first_name} {row.last_name}</div>
                                                        <div>{row.work_area}</div>
                                                        <div>{row.task_area}</div>
                                                        <div>{row.role}</div>
                                                        <div>{row.hours}</div>
                                                        <input
                                                            type="number"
                                                            className="border px-2 py-1 w-20"
                                                            value={row.rate}
                                                            onChange={(e) => handleRateChange(projectKey, rows.indexOf(row), e.target.value)}
                                                        />
                                                        <div>${calculateAmount(row.hours, row.rate)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="text-right mt-2 font-bold text-green-700">
                                            Project Subtotal: ${calculateProjectTotal(userRows)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Invoice Bottom Section */}
            <div className="mt-8 border-t pt-4 grid grid-cols-4 gap-4 items-center">
                <div>
                    <label className="block text-sm font-semibold mb-1">Due Date *</label>
                    <DatePicker selected={dueDate} onChange={setDueDate} className="border px-2 py-1 rounded w-full" />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Tax Rate (%) *</label>
                    <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="border px-3 py-2 rounded w-full"
                    />
                </div>
                <div className="text-lg font-bold text-right col-span-2">
                    Invoice Total: ${calculateInvoiceTotal()}
                </div>
            </div>
            <div className="text-right mt-4">
                <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Update Invoice
                </button>
            </div>
        </div>
    );
};

export default EditInvoiceModal;
