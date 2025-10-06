import React, { useEffect, useState, useMemo } from "react";
import { FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import axios from "axios";
import API from "../api/config";
import Select from "react-select";

const ManageProjects = ({ companyId, companyName, onClose }) => {
    const [projects, setProjects] = useState([]);
    const [editingProject, setEditingProject] = useState(null);
    const [formData, setFormData] = useState({
        project_name: "",
        sow_id: "",
        current_status: "Active",
        original_start_date: "",
        original_end_date: "",
        total_projected_hours: "",
    });
    const [employees, setEmployees] = useState([]);
    const [rolesFromDB, setRolesFromDB] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState(null);

   

    const [selectedRoleEmployees, setSelectedRoleEmployees] = useState([]);
    const [roleAssignments, setRoleAssignments] = useState([]); // Holds the object { employeeIds, estimated_hours, rates, role_id, role_name}
     const [estimatedRoleHours, setEstimatedRoleHours] = useState("");

    const [editingRoleIndex, setEditingRoleIndex] = useState(null);
    const token = localStorage.getItem("token");
    const [showNewRoleField, setShowNewRoleField] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");

    useEffect(() => {
        if (companyId) {
            fetchProjects();
            fetchEmployees();
            fetchRoles();
        }
    }, [companyId]);

    const fetchProjects = async () => {
        try {
            const res = await axios.get(API.PROJECTS_BY_COMPANY(companyId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProjects(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch projects", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(API.FETCH_ALL_EMPLOYEES, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // make sure it's an array
            let data = Array.isArray(res.data) ? res.data : [];
            // sort in place by "First Last"
            data.sort((a, b) => {
                const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            setEmployees(data);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await axios.get(API.FETCH_ROLES, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRolesFromDB(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch roles", err);
        }
    };

    const handleEdit = async (proj) => {
        const formatDate = (d) => {
            const dt = new Date(d);
            return isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0];
        };

        setEditingProject(proj);
        setFormData({
            project_name: proj.project_name || "",
            sow_id: proj.sow_id || "",
            current_status: proj.current_status || "Active",
            original_start_date: formatDate(proj.original_start_date),
            original_end_date: formatDate(proj.original_end_date),
            total_projected_hours: proj.total_projected_hours || "",
        });

        try {
            const assignmentsUrl = API.GET_PROJECT_ASSIGNMENTS(proj.sow_id);

            const [assignRes, empRes, roleRes] = await Promise.all([
                axios.get(assignmentsUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(API.FETCH_ALL_EMPLOYEES, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(API.FETCH_ROLES, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            // build & sort employees list A→Z by "First Last"
            const employeesList = Array.isArray(empRes.data) ? empRes.data : [];
            employeesList.sort((a, b) => {
                const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });

            const rolesList = Array.isArray(roleRes.data) ? roleRes.data : [];

            const assignmentData = (assignRes.data || []).map((r) => {
                const rates = {};
                if (Array.isArray(r.employees_with_rates)) {
                    r.employees_with_rates.forEach(emp => {
                        rates[emp.emp_id] = emp.rate;
                    });
                }

                return {
                    role_id: Number(r.role_id),
                    role_name: r.role_name,
                    estimated_hours: Number(r.estimated_hours),
                    employees: Array.isArray(r.employees_with_rates)
                        ? r.employees_with_rates.map((e) => Number(e.emp_id))
                        : [],
                    rates,
                    perEmployeeHours: {}
                };
            });

            setEmployees(employeesList);
            setRolesFromDB(rolesList);
            setRoleAssignments(assignmentData);

            // Do not pre-fill Assign Role section when editing
            setSelectedRoleId(null);
            setEstimatedRoleHours("");
            setSelectedRoleEmployees([]);
            setEditingRoleIndex(null);
        } catch (err) {
            console.error("Error loading role assignments:", err);
            alert("Couldn't load project roles – check console/network for issues.");
        }
    };


    useEffect(() => {
        console.log("Current roleAssignments", roleAssignments);
    }, [roleAssignments]);


    const handleDelete = async (sow_id) => {
        if (!window.confirm("Are you sure you want to delete this project?")) return;

        try {
            await axios.delete(API.GET_PROJECT_BY_SOW_ID(sow_id), {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log(`🗑️ Deleted project with SOW ID: ${sow_id}`);

            // 👇 Clear old projects visually first
            setProjects([]);

            // ✅ Refresh project list
            await fetchProjects();

            if (editingProject?.sow_id === sow_id) {
                resetForm();
            }

        } catch (err) {
            console.error("❌ Delete failed:", err);
            alert("Failed to delete project. See console for details.");
        }
    };



    const resetForm = () => {
        setFormData({
            project_name: "",
            sow_id: "",
            current_status: "Active",
            original_start_date: "",
            original_end_date: "",
            total_projected_hours: "",
        });

        setEditingProject(null);
        setRoleAssignments([]);
        setSelectedRoleId(null); // Use null for consistency with initial state
        setEstimatedRoleHours("");
        setSelectedRoleEmployees([]);
        setEditingRoleIndex(null); // Make sure to reset this too
    };

    const handleEmpHoursChange = (roleIndex, empId, rawVal) => {
        setRoleAssignments(prev => {
            const next = [...prev];
            const hrs = Math.max(0, Number(rawVal) || 0);

            if (!next[roleIndex].perEmployeeHours) next[roleIndex].perEmployeeHours = {};
            next[roleIndex].perEmployeeHours[empId] = hrs;

            // Recalculate role total as the sum of per-employee hours
            const total = Object.values(next[roleIndex].perEmployeeHours).reduce(
                (s, n) => s + (Number(n) || 0),
                0
            );
            next[roleIndex].estimated_hours = total;

            return next;
        });
    };


    const renderEmployeeRateInputs = (role, index, employees, onRateChange, onEmpHoursChange) => {
        return role.employees.map((empId) => {
            const emp = employees.find(e => e.emp_id === empId);
            const currentRate = role.rates?.[empId] || "";
             const currentEmpHours = role.perEmployeeHours?.[empId] ?? "";

            return (
                <div key={empId} className="flex items-center gap-2 mb-2">
                    <div className="w-1/2">{emp?.first_name} {emp?.last_name}</div>
                     {/* Total Role Hourly Rate */}
                    <input
                        type="number"
                        className="w-1/2 border rounded px-2 py-1"
                        placeholder="Hourly Rate"
                        value={currentRate}
                        onChange={(e) => onRateChange(index, empId, e.target.value)}
                    />
                    {/* Per-employee Estimated Hours */}
                    <input
                        type="number"
                        className="w-1/2 border rounded px-2 py-1"
                        placeholder="Estimated Hours"
                        value={currentEmpHours}
                        onChange={(e) => onEmpHoursChange(index, empId, e.target.value)}
                        min="0"
                        step="any"
                    />
                </div>
            );
        });
    };

    const handleAddRole = async () => {
        let roleId = selectedRoleId;
        // const estimatedHours = parseInt(estimatedRoleHours);

        if (showNewRoleField) {
            if (!newRoleName.trim()) {
                alert("Please enter a new role name.");
                return;
            }

            try {
                const newRoleRes = await axios.post(API.CREATE_ROLE, {
                    role_name: newRoleName.trim(),
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const newRole = newRoleRes.data;
                roleId = newRole.role_id;
                setRolesFromDB([...rolesFromDB, newRole]); // Add to dropdown
            } catch (err) {
                console.error("Failed to create role", err);
                alert("Failed to create new role.");
                return;
            }
        }

        if (!roleId) {
            alert("Please select a role and employees.");
            return;
        }

        const role = rolesFromDB.find((r) => r.role_id === roleId) || { role_name: newRoleName.trim(), role_id: roleId };

        // Build employee + rate mapping
        const employeeIds = selectedRoleEmployees.map((e) => e.value);
        const rates = {};

        employeeIds.forEach(empId => {
            const inputId = `rate-${roleId}-${empId}`;
            const rateVal = document.getElementById(inputId)?.value;
            const parsedRate = parseFloat(rateVal);
            if (!isNaN(parsedRate)) {
                rates[empId] = parsedRate;
            }
            // Don't alert here — allow user to correct after
        });

        const updatedRole = {
            role_id: roleId,
            role_name: role.role_name,
            estimated_hours: 0, // A sum of all per-employee hours
            employees: employeeIds,
            rates: rates, // ⬅️ NEW: storing individual rates
            perEmployeeHours: {} // { [empId]: number }
        };

        setRoleAssignments((prev) => {
            if (editingRoleIndex !== null && editingRoleIndex >= 0) {
                const newAssignments = [...prev];
                newAssignments[editingRoleIndex] = updatedRole;
                return newAssignments;
            } else {
                const isDuplicate = prev.some((r) => r.role_id === roleId);
                if (isDuplicate) {
                    alert("This role is already assigned.");
                    return prev;
                }
                return [...prev, updatedRole];
            }
        });

        // Reset fields
        setSelectedRoleId(null);
        setEstimatedRoleHours("");
        setSelectedRoleEmployees([]);
        setNewRoleName("");
        setShowNewRoleField(false);
        setEditingRoleIndex(null);
    };

    // Sum all role estimated hours (coerce safely)
    const totalEstimated = useMemo(
        () =>
            roleAssignments.reduce(
                (sum, r) => sum + (parseInt(r.estimated_hours, 10) || 0),
                0
            ),
        [roleAssignments]
    );

    // Keep formData in sync so payload uses the derived value
    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            total_projected_hours: totalEstimated, // keep as a number
        }));
    }, [totalEstimated]);

    const handleSave = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Session expired. Please log in again.");
            return;
        }

        // ─── Field validations ────────────────────────────────────────────
        if (!formData.project_name.trim()) {
            alert("Project Name is required.");
            return;
        }
        if (!formData.original_start_date) {
            alert("Start Date is required.");
            return;
        }
        if (!formData.original_end_date) {
            alert("End Date is required.");
            return;
        }
        if (
            !formData.total_projected_hours ||
            isNaN(formData.total_projected_hours) ||
            Number(formData.total_projected_hours) <= 0
        ) {
            alert("Estimated Hours must be a positive number.");
            return;
        }
        // ──────────────────────────────────────────────────────────────────

        // collect roleAssignments + maybe auto-add the one in the picker
        let assignmentsToSave = [...roleAssignments];
        const roleId = parseInt(selectedRoleId);
        const estimatedHours = parseInt(estimatedRoleHours);
        console.log("Selected roleId/estHours:", roleId, estimatedHours);

        if (roleId && (isNaN(estimatedHours) || estimatedHours <= 0)) {
            alert("Please enter valid estimated hours for the selected role.");
            return;
        }

        const hasUnaddedRole =
            roleId &&
            !isNaN(estimatedHours) &&
            !assignmentsToSave.some(r => r.role_id === roleId);

        if (hasUnaddedRole) {
            const roleObj = rolesFromDB.find(r => r.role_id === roleId);
            if (roleObj) {
                assignmentsToSave.push({
                    role_id: roleId,
                    role_name: roleObj.role_name,
                    estimated_hours: estimatedHours,
                    employees: selectedRoleEmployees.map(e => e.value),
                    rates: { ...roleObj.rates }  // preserve any typed‐in rates
                });
            }
        }

        if (assignmentsToSave.length === 0) {
            alert("Please assign at least one role (employees optional).");
            return;
        }

        console.log("📝 Assignments to save:", assignmentsToSave);

        try {
            // 1) create or update project
            const payload = { ...formData, company_id: companyId };
            let sowIdToUse = formData.sow_id;
            if (editingProject) {
                await axios.put(API.GET_PROJECT_BY_SOW_ID(sowIdToUse), payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                const res = await axios.post(API.GET_ALL_PROJECTS, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                sowIdToUse = res.data.sow_id;
                setFormData(prev => ({ ...prev, sow_id: sowIdToUse }));
            }

            // 2) fetch existing assignments (with rates) once
            const existing = editingProject
                ? await axios.get(API.GET_PROJECT_ASSIGNMENTS(sowIdToUse), {
                    headers: { Authorization: `Bearer ${token}` },
                }).then(r => r.data)
                : [];

            // build maps: role → [emp_ids]  AND  role → { emp_id: oldRate }
            const existingMap = {}, rateMap = {};
            existing.forEach(e => {
                existingMap[e.role_id] = e.employees_with_rates.map(x => x.emp_id);
                rateMap[e.role_id] = e.employees_with_rates.reduce((acc, x) => {
                    acc[x.emp_id] = x.rate;
                    return acc;
                }, {});
            });

            // 3) per‐role: upsert hours, delete removed emps, add new emps, update changed rates
            for (const role of assignmentsToSave) {
                const oldList = existingMap[role.role_id] || [];
                const newList = Array.isArray(role.employees) ? role.employees : [];

                // 3a) upsert role hours
                await axios.post(API.ASSIGN_ROLE, {
                    sow_id: sowIdToUse,
                    role_id: role.role_id,
                    estimated_hours: role.estimated_hours,
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                // 3b) delete employees removed in UI
                for (const empId of oldList) {
                    if (!newList.includes(empId)) {
                        await axios.delete(
                            API.DELETE_ROLE_EMPLOYEE(sowIdToUse, role.role_id, empId),
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                    }
                }

                // 3c) add any brand-new employees
                for (const empId of newList.filter(id => !oldList.includes(id))) {
                    const rawRate = role.rates?.[empId];
                    const parsed = parseFloat(rawRate);
                    const rateToSend = isNaN(parsed) ? null : parsed;

                    await axios.post(API.ASSIGN_EMPLOYEE, {
                        sow_id: sowIdToUse,
                        emp_id: empId,
                        role_id: role.role_id,
                        rate: rateToSend,
                    }, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                }

                // 3d) **update hourly‐rate changes** for employees that remained
                for (const empId of newList.filter(id => oldList.includes(id))) {
                    const rawRate = role.rates?.[empId];
                    const parsed = parseFloat(rawRate);
                    const rateToSend = isNaN(parsed) ? null : parsed;
                    const oldRate = rateMap[role.role_id]?.[empId];

                    // only POST if they actually changed their rate
                    if (rateToSend !== oldRate) {
                        await axios.post(API.ASSIGN_EMPLOYEE, {
                            sow_id: sowIdToUse,
                            emp_id: empId,
                            role_id: role.role_id,
                            rate: rateToSend,
                        }, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                    }
                }
            }

            // 4) refresh & reset
            await fetchProjects();
            resetForm();
        } catch (err) {
            console.error("❌ Project save failed:", err.response?.data || err);
            alert("Save failed. See console for details.");
        }
    };


    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl w-[1100px] p-8 relative shadow-lg overflow-y-auto max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                    <FaTimes />
                </button>
                <h2 className="text-2xl font-bold text-purple-800 mb-4">Manage Projects for {companyName}</h2>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-800">Select Project to Edit</h3>
                            <button onClick={resetForm} className="text-purple-600 font-medium">+ Add Project</button>
                        </div>
                        <ul className="bg-purple-50 p-3 rounded-lg h-[360px] overflow-auto">
                            {projects.map((proj, idx) => (
                                <li key={proj.sow_id} className="flex justify-between items-center mb-2 bg-white p-2 rounded shadow">
                                    <span>{idx + 1}. {proj.project_name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(proj)}>
                                            <FaEdit className="text-purple-600" />
                                        </button>

                                        <button onClick={() => handleDelete(proj.sow_id)}>
                                            <FaTrash className="text-red-600" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <div className="mb-2">
                            <label className="block text-sm mb-1">*Project Name</label>
                            <input value={formData.project_name} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                                <label className="block text-sm mb-1">*SOW ID</label>
                                <input
                                    value={formData.sow_id}
                                    disabled
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Will be generated automatically"
                                />

                            </div>
                            <div>
                                <label className="block text-sm mb-1">Project Status</label>
                                <select value={formData.current_status} onChange={(e) => setFormData({ ...formData, current_status: e.target.value })} className="w-full border rounded px-3 py-2">
                                    <option value="Active">Active</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                                <label className="block text-sm mb-1">*Start Date</label>
                                <input type="date" value={formData.original_start_date} onChange={(e) => setFormData({ ...formData, original_start_date: e.target.value })} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">*End Date</label>
                                <input type="date" value={formData.original_end_date} onChange={(e) => setFormData({ ...formData, original_end_date: e.target.value })} className="w-full border rounded px-3 py-2" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm mb-1">*Project's Total Estimated Hours (Sum Total)</label>
                            <input
                                type="number"
                                value={totalEstimated}
                                readOnly
                                className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Calculated from role estimated hours.
                            </p>
                        </div>


                        <div className="mb-4">

                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-semibold">*Assign Roles</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (showNewRoleField) {
                                            // Cancel: hide new role UI and restore defaults
                                            setShowNewRoleField(false);
                                            setNewRoleName("");
                                            setSelectedRoleId(null); // or keep previous value if you want
                                        } else {
                                            // Add new role mode
                                            setShowNewRoleField(true);
                                            setSelectedRoleId(null);
                                        }
                                    }}
                                    className={`text-sm font-medium ${showNewRoleField
                                        ? "text-red-600 hover:text-red-800"
                                        : "text-purple-600 hover:text-purple-800"
                                        }`}
                                >
                                    {showNewRoleField ? "Cancel" : "+ Create New Role"}
                                </button>
                            </div>


                            <div className="flex flex-col gap-1 mb-2">
                                
                                <div className="flex gap-2">
                                    <select
                                        value={showNewRoleField ? "new" : selectedRoleId ?? ""}
                                        onChange={(e) => {
                                            if (!showNewRoleField) {
                                                const val = e.target.value;
                                                setSelectedRoleId(val ? parseInt(val, 10) : null);
                                            }
                                        }}
                                        disabled={showNewRoleField}
                                        className={`w-1/2 border rounded px-3 py-2 ${showNewRoleField
                                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                : ""
                                            }`}
                                    >
                                        <option value="">{showNewRoleField ? "Creating New Role" : "Select Role"}</option>
                                        {!showNewRoleField &&
                                            rolesFromDB.map((role) => (
                                                <option key={role.role_id} value={role.role_id}>
                                                    {role.role_name}
                                                </option>
                                            ))}
                                    </select>

                                </div>

                                {showNewRoleField && (
                                    <div className="">
                                        <label className="block text-sm mb-1">New Role Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter new role name"
                                            value={newRoleName}
                                            onChange={(e) => setNewRoleName(e.target.value)}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                )}


                            </div>


                            <label className="block text-sm mb-1">Select Employees</label>
                            <Select
                                isMulti
                                value={selectedRoleEmployees}
                                onChange={(selected) => setSelectedRoleEmployees(selected)}
                                options={employees.map(emp => ({
                                    value: emp.emp_id,
                                    label: `${emp.first_name} ${emp.last_name}`
                                }))}
                                className="mb-2"
                            />

                            <button onClick={handleAddRole} className="bg-purple-600 text-white px-4 py-2 rounded">+ Add</button>
                        </div>

                        {Array.isArray(roleAssignments) && roleAssignments.length > 0 ? (
                            roleAssignments.map((role, index) => (
                                <div key={`${role.role_id}-${index}`} className="mb-3 border p-3 rounded bg-gray-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-semibold">{role.role_name || `Role ID ${role.role_id}`}</div>
                                        <button
                                            onClick={async () => {
                                                if (editingProject) {
                                                    const confirm = window.confirm(`Remove role ${role.role_name}?`);
                                                    if (!confirm) return;

                                                    try {
                                                        await axios.delete(API.DELETE_PROJECT_ROLE(formData.sow_id, role.role_id), {
                                                            headers: { Authorization: `Bearer ${token}` },
                                                        });
                                                    } catch (err) {
                                                        console.error("Failed to remove role from backend:", err);
                                                        alert("Failed to remove role. Please try again.");
                                                        return;
                                                    }
                                                }

                                                const updated = [...roleAssignments];
                                                updated.splice(index, 1);
                                                setRoleAssignments(updated);
                                            }}
                                            className="text-red-600 hover:underline text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 mb-2">
                                        <label className="text-sm text-gray-600 w-32">Estimated Hours</label>
                                        <input
                                            type="number"
                                            className="border px-2 py-1 rounded w-32 text-sm"
                                            value={role.estimated_hours}
                                            onChange={(e) => {
                                                const updated = [...roleAssignments];
                                                updated[index].estimated_hours = parseInt(e.target.value) || 0;
                                                setRoleAssignments(updated);
                                            }}
                                        />
                                    </div>

                                    <div className="mb-2">
                                        <label className="text-sm text-gray-600">Assigned Employees</label>
                                        <Select
                                            isMulti
                                            value={role.employees
                                                .map(empId => {
                                                    const emp = employees.find(e => e.emp_id === empId);
                                                    return emp ? { value: emp.emp_id, label: `${emp.first_name} ${emp.last_name}` } : null;
                                                })
                                                .filter(Boolean)
                                            }
                                            options={employees.map(emp => ({
                                                value: emp.emp_id,
                                                label: `${emp.first_name} ${emp.last_name}`
                                            }))}
                                            onChange={(selectedOptions) => {
                                                const newEmployeeIds = selectedOptions.map(opt => opt.value);
                                                setRoleAssignments(prev => {
                                                    const next = [...prev];
                                                    next[index] = {
                                                        ...next[index],
                                                        employees: newEmployeeIds
                                                    };
                                                    return next;
                                                });
                                            }}
                                            className="mt-1"
                                        />


                                    </div>

                                    {renderEmployeeRateInputs(role, index, employees, (roleIndex, empId, rateVal) => {
                                        setRoleAssignments((prev) => {
                                            const updated = [...prev];
                                            if (!updated[roleIndex].rates) updated[roleIndex].rates = {};
                                            updated[roleIndex].rates[empId] = rateVal;
                                            return updated;
                                        });
                                    },
                                        handleEmpHoursChange
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 italic">No roles assigned yet.</div>
                        )}



                        <div className="text-right mt-4">
                            <button onClick={handleSave} className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageProjects;
