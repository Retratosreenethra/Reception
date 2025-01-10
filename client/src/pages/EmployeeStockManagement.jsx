// client/src/pages/EmployeeStockManagement.jsx

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  addPurchase,
  // addNewProduct,   // Adjust if you no longer have addNewProduct for "insurance"
  // updateExistingProduct,
  // addOrUpdateStock,
} from "../services/authService";
import supabase from '../supabaseClient';
import { useAuth } from "../context/AuthContext";
import { useGlobalState } from "../context/GlobalStateContext";
import { debounce } from "lodash";
import Modal from "react-modal";
import EmployeeVerification from "../components/EmployeeVerification";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Navigate } from "react-router-dom";

Modal.setAppElement("#root");

const EmployeeStockManagement = ({ isCollapsed }) => {
  const { user, role, branch } = useAuth();
  const { state, dispatch } = useGlobalState();

  const [mode, setMode] = useState("add"); // Default to "add"
  const [isLoading, setIsLoading] = useState(false);
  const isUploadingRef = useRef(false);

  // For demonstration, we keep some of the old logic about pagination, but you may remove if not needed
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // This might remain if you have multiple branches
  const targetBranch = role === "admin" ? "G001" : branch;

  // Lookup Branch for Admin to view (optional)
  const [lookupBranch, setLookupBranch] = useState(branch);
  const [branchesList, setBranchesList] = useState([]);

  // Debounce ref for searching insurance
  const debouncedFetchSuggestions = useRef(
    debounce(async (query) => {
      if (query.length < 3) {
        setInsuranceSuggestions([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("insurance")
          .select("s_idCR, s_name, s_rate, s_dept, s_doctor")
          // Adjust your filter logic below:
          .or(`s_name.ilike.%${query}%,s_idCR.ilike.%${query}%`)
          .limit(20);

        if (error) throw error;
        setInsuranceSuggestions(data || []);
      } catch (err) {
        console.error("Error fetching insurance suggestions:", err);
        toast.error("Failed to fetch suggestions from 'insurance'.");
      }
    }, 300)
  ).current;

  // Example state for "Add New Insurance" form
  const [addInsurances, setAddInsurances] = useState([
    {
      insuranceName: "",   // s_name
      insuranceIdCR: "",   // s_idCR
      insuranceRate: "",   // s_rate
      insuranceDept: "",   // s_dep
      insuranceDoctor: "", // s_doctor
      // Any additional fields you might still need:
      // quantity: "",
      // ...
    },
  ]);

  // Example placeholders for Bill Info (if you still need them)
  const [addBillNumber, setAddBillNumber] = useState("");
  const [addBillDate, setAddBillDate] = useState("");
  const [addEmployeeId, setAddEmployeeId] = useState(null);

  // Suggestions for searching "insurance" data
  const [insuranceSuggestions, setInsuranceSuggestions] = useState([]);

  // If you still fetch employees:
  const [employees, setEmployees] = useState([]);

  // If you still track stock or purchase-from logic, keep them:
  const [purchaseFromList, setPurchaseFromList] = useState([]);

  //--- SAMPLE: If you still want to fetch employees, adjusted for admin-only or otherwise:
  const fetchEmployees = useCallback(async () => {
    try {
      let query = supabase
        .from("employees")
        .select("id, name")
        .eq("branch", branch)
        .order("name", { ascending: true });

      if (role === "admin") {
        query = query.eq("role", "admin");
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to fetch employees.");
        setEmployees([]);
        return;
      }
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("An unexpected error occurred while fetching employees.");
      setEmployees([]);
    }
  }, [branch, role]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  //--- SAMPLE: If you need to fetch distinct "purchaseFrom" from insurance or some other logic
  const fetchPurchaseFromOptions = useCallback(async () => {
    // Adjust this as needed (the "insurance" table might not have purchase_from):
    try {
      // Example: Possibly you skip this if there's no purchase_from in "insurance"
      const { data, error } = await supabase
        .from("insurance")
        .select("s_doctor", { distinct: true });

      if (error) {
        console.error("Error fetching distinct doctors:", error);
        return;
      }

      // Make them unique. This is just an example:
      const uniqueDoctors = Array.from(new Set((data || []).map((d) => d.s_doctor).filter(Boolean)));
      setPurchaseFromList(uniqueDoctors);
    } catch (err) {
      console.error("Error fetching distinct doctors:", err);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseFromOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup for the debounced function
  useEffect(() => {
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [debouncedFetchSuggestions]);

  // Example: If you generate a Bill Number
  const generateBillNumber = useCallback(async () => {
    // This logic is up to you; adjusting if you have a "purchases" table, or something else
    return "BILL-0001";
  }, [targetBranch]);

  // Whenever the mode or targetBranch changes, set up Bill details
  useEffect(() => {
    const setupBillDetails = async () => {
      const billNumber = await generateBillNumber();
      const currentDate = new Date().toISOString().split("T")[0];

      if (mode === "add") {
        setAddBillNumber(billNumber);
        setAddBillDate(currentDate);
      }
    };
    if (targetBranch) {
      setupBillDetails();
    }
  }, [targetBranch, mode, generateBillNumber]);

  // Handle "Add Another" for array of insurance
  const handleAddInsuranceEntry = () => {
    setAddInsurances([
      ...addInsurances,
      {
        insuranceName: "",
        insuranceIdCR: "",
        insuranceRate: "",
        insuranceDept: "",
        insuranceDoctor: "",
      },
    ]);
  };

  const handleRemoveAddInsuranceEntry = (index) => {
    const updated = [...addInsurances];
    updated.splice(index, 1);
    setAddInsurances(updated);
  };

  // Example: Handler for your input changes
  const handleInsuranceFieldChange = (index, field, value) => {
    const updated = [...addInsurances];
    updated[index][field] = value;
    setAddInsurances(updated);
  };

  // Example: If you still have a search for "update mode"
  const handleUpdateSearchInputChange = (e) => {
    const query = e.target.value.trim();
    if (query.length > 2) {
      debouncedFetchSuggestions(query);
    } else {
      setInsuranceSuggestions([]);
    }
  };

  // Example: If you select a suggestion
  const handleSelectInsuranceSuggestion = (suggestion) => {
    // do something with suggestion
    // e.g. setAddInsurances() or setUpdateProducts()...
    toast.success(`Selected insurance: ${suggestion.s_name}`);
    setInsuranceSuggestions([]);
  };

  // If you have a radio or button to switch modes
  const handleModeSelection = (selectedMode) => {
    setMode(selectedMode);
    // Clear out form states as needed
    setAddInsurances([
      {
        insuranceName: "",
        insuranceIdCR: "",
        insuranceRate: "",
        insuranceDept: "",
        insuranceDoctor: "",
      },
    ]);
    toast.dismiss();
  };

  // Example: Submitting the "Add New Insurance" form
  const handleAddNewInsurances = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!addBillNumber || !addBillDate || !addEmployeeId) {
      toast.error("Please fill Bill Number, Bill Date, and Employee.");
      return;
    }

    // Validate each insurance line
    for (let i = 0; i < addInsurances.length; i++) {
      const ins = addInsurances[i];
      if (!ins.insuranceName.trim()) {
        toast.error(`Please fill Insurance Name (#${i + 1})`);
        return;
      }
      if (!ins.insuranceIdCR.trim()) {
        toast.error(`Please fill Insurance ID (#${i + 1})`);
        return;
      }
    }

    setIsLoading(true);
    isUploadingRef.current = true;

    try {
      const employeeName =
        employees.find((emp) => emp.id === addEmployeeId)?.name || "Unknown";

      // Prepare data for a confirmation modal, if you still do that
      const previewData = {
        mode: "Add New Insurance",
        bill_date: addBillDate,
        bill_number: addBillNumber,
        employee: employeeName,
        employee_id: addEmployeeId,
        insurances: addInsurances.map((item) => ({
          s_name: item.insuranceName.trim(),
          s_idCR: item.insuranceIdCR.trim(),
          s_rate: parseFloat(item.insuranceRate) || 0,
          s_dept: item.insuranceDept.trim(),
          s_doctor: item.insuranceDoctor.trim(),
        })),
      };

      // Open your modal (or proceed with direct DB inserts)
      dispatch({
        type: "SET_PURCHASE_MODAL",
        payload: {
          action: "add",
          content: previewData,
          showModal: true,
        },
      });
    } catch (err) {
      console.error("Error preparing add new insurance data:", err);
      toast.error("An unexpected error occurred.");
      setIsLoading(false);
      isUploadingRef.current = false;
    }
  };

  // Example final "processAddNewInsurances" if you want to commit to DB:
  const processAddNewInsurances = async () => {
    const previewData = state.purchaseModal.content;
    if (!previewData) {
      toast.error("No insurance data to process.");
      setIsLoading(false);
      isUploadingRef.current = false;
      return;
    }

    const { insurances } = previewData;

    try {
      for (let item of insurances) {
        // Here you might do your own "insert" into insurance if you want to create new rows:
        const { data, error } = await supabase.from("insurance").insert([
          {
            s_name: item.s_name,
            s_idCR: item.s_idCR,
            s_rate: item.s_rate,
            s_dept: item.s_dept,
            s_doctor: item.s_doctor,
          },
        ]);

        if (error) {
          toast.error(`Failed to add ${item.s_name}: ${error.message}`);
          continue;
        }
        toast.success(`Insurance ${item.s_name} added successfully.`);
      }

      // Reset form, fetch new data, etc.
      handleModeSelection("add");
    } catch (err) {
      console.error("Error processing add new insurances:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      dispatch({ type: "RESET_PURCHASE_MODAL" });
      setIsLoading(false);
      isUploadingRef.current = false;
    }
  };

  // If you confirm the modal
  const handleConfirmModal = () => {
    if (state.purchaseModal.action === "add") {
      processAddNewInsurances();
    }
    // else if (state.purchaseModal.action === "update") { ... }
  };

  // If you cancel the modal
  const handleCancelModal = () => {
    dispatch({ type: "RESET_PURCHASE_MODAL" });
    setIsLoading(false);
    isUploadingRef.current = false;
    toast.dismiss();
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isCollapsed ? "mx-20" : "mx-20 px-20"
      } justify-center my-20 p-8 rounded-xl mx-auto max-w-4xl bg-green-50 shadow-inner`}
    >
      <ToastContainer
        position="top-right"
        autoClose={8000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <h1 className="text-2xl font-semibold mb-6 text-center">
         Management
      </h1>

      {/* Mode Selection Buttons */}
      <div className="flex justify-center mb-6 text-lg font-semibold">
        <button
          onClick={() => handleModeSelection("add")}
          className={`mx-2 px-4 py-2 rounded ${
            mode === "add"
              ? "bg-green-500 text-white shadow-2xl"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Add New Service Id
        </button>
        {/* If you have an update mode, keep it:
        <button
          onClick={() => handleModeSelection("update")}
          className={`mx-2 px-4 py-2 rounded ${
            mode === "update"
              ? "bg-green-500 text-white shadow-2xl"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Update Existing
        </button>
        */}
      </div>

      {mode === "add" && (
        <form onSubmit={handleAddNewInsurances} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Service Id</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="addBillDate" className="block mb-2 font-medium">
                Bill Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="addBillDate"
                value={addBillDate}
                onChange={(e) => setAddBillDate(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label htmlFor="addBillNumber" className="block mb-2 font-medium">
                Bill Number<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="addBillNumber"
                value={addBillNumber}
                onChange={(e) => setAddBillNumber(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label htmlFor="addEmployee" className="block mb-2 font-medium">
                Employee<span className="text-red-500">*</span>
              </label>
              <select
                id="addEmployee"
                value={addEmployeeId || ""}
                onChange={(e) => setAddEmployeeId(parseInt(e.target.value, 10))}
                className="w-full p-2 border rounded"
                required
              >
                <option value="" disabled>
                  Select Employee
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {addInsurances.map((ins, i) => (
            <div
              key={i}
              className="border p-4 mb-4 rounded-lg bg-white relative"
            >
              {addInsurances.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveAddInsuranceEntry(i)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  title="Remove Entry"
                >
                  &times;
                </button>
              )}
              <h3 className="text-lg font-medium mb-2">
                Service ID #{i + 1}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2 font-medium">
                     Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ins.insuranceName}
                    onChange={(e) =>
                      handleInsuranceFieldChange(i, "insuranceName", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Service ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ins.insuranceIdCR}
                    onChange={(e) =>
                      handleInsuranceFieldChange(i, "insuranceIdCR", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Doctor Name 
                  </label>
                  <input
                    type="text"
                    value={ins.insuranceDoctor}
                    onChange={(e) =>
                      handleInsuranceFieldChange(i, "insuranceDoctor", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Department
                  </label>
                  <input
                    type="text"
                    value={ins.insuranceDept}
                    onChange={(e) =>
                      handleInsuranceFieldChange(i, "insuranceDept", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Rate 
                  </label>
                  <input
                    type="number"
                    value={ins.insuranceRate}
                    onChange={(e) =>
                      handleInsuranceFieldChange(i, "insuranceRate", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddInsuranceEntry}
            className="mb-4 text-blue-500 hover:underline"
          >
            + Add Another
          </button>

          <button
            type="submit"
            className={`mt-4 w-full p-2 text-white rounded ${
              isLoading
                ? "bg-blue-500 cursor-not-allowed flex items-center justify-center"
                : "bg-green-500 hover:bg-green-600"
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-white rounded-full"
                  viewBox="0 0 24 24"
                ></svg>
                Preparing...
              </>
            ) : (
              "Add New Service ID"
            )}
          </button>
        </form>
      )}

      {role === "admin" && (
        <div className="mt-8">
          <div className="mb-4 relative">
            <label htmlFor="lookupBranch" className="block mb-2 font-medium">
              Select Branch to View (Admin)
            </label>
            <select
              id="lookupBranch"
              value={lookupBranch}
              onChange={(e) => setLookupBranch(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="" disabled>
                Select Branch
              </option>
              {branchesList.map((b) => (
                <option key={b.branch_code} value={b.branch_code}>
                  {b.branch_name} {b.type === "godown" ? "(Godown)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Example: If you used to display stock or insurance table, adapt below */}
      {/* <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          Current Insurance in Branch: {role === "admin" ? lookupBranch : branch}
        </h2>

        <input
          type="text"
          placeholder="Search by Insurance Name or ID"
          onChange={handleUpdateSearchInputChange}
          className="w-full p-2 border rounded mb-4"
        />

        {insuranceSuggestions.length > 0 && (
          <ul className="border rounded bg-white shadow-md max-h-60 overflow-y-auto p-2">
            {insuranceSuggestions.map((item) => (
              <li
                key={item.s_idCR}
                onClick={() => handleSelectInsuranceSuggestion(item)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {item.s_name} ({item.s_idCR})
              </li>
            ))}
          </ul>
        )}
      </div> */}

      {/* Purchase Modal */}
      <Modal
        isOpen={state.modals.showPurchaseModal}
        onRequestClose={handleCancelModal}
        contentLabel="Preview Purchase"
        className="max-w-4xl mx-auto mt-20 bg-white p-6 rounded shadow-lg outline-none max-h-screen overflow-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {state.purchaseModal.content && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Preview {state.purchaseModal.content.mode}
            </h2>

            {state.purchaseModal.content.mode.includes("Insurance") ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Bill Date:</span>
                  </div>
                  <div>{state.purchaseModal.content.bill_date}</div>

                  <div>
                    <span className="font-medium">Bill Number:</span>
                  </div>
                  <div>{state.purchaseModal.content.bill_number || ""}</div>

                  <div>
                    <span className="font-medium">Employee:</span>
                  </div>
                  <div>{state.purchaseModal.content.employee}</div>
                </div>

                <h3 className="font-medium mt-4">Insurances:</h3>
                <table className="min-w-full bg-gray-100">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Insurance ID</th>
                      <th className="py-2 px-4 border-b">Name</th>
                      <th className="py-2 px-4 border-b">Rate</th>
                      <th className="py-2 px-4 border-b">Department</th>
                      <th className="py-2 px-4 border-b">Doctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.purchaseModal.content.insurances.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-4 border-b text-center">
                          {item.s_idCR}
                        </td>
                        <td className="py-2 px-4 border-b">{item.s_name}</td>
                        <td className="py-2 px-4 border-b text-center">
                          {item.s_rate}
                        </td>
                        <td className="py-2 px-4 border-b text-center">
                          {item.s_dept}
                        </td>
                        <td className="py-2 px-4 border-b text-center">
                          {item.s_doctor}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Single insurance object? Or some other fallback
              <div>Nothing to preview</div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Verify Employee</h3>
              <EmployeeVerification
                employee={state.purchaseModal.content.employee}
                onVerify={(isVerified, message) => {
                  if (isVerified) {
                    dispatch({
                      type: "SET_PURCHASE_MODAL",
                      payload: {
                        ...state.purchaseModal,
                        content: {
                          ...state.purchaseModal.content,
                          isEmployeeVerified: true,
                          verificationMessage: message,
                        },
                        showModal: true,
                      },
                    });
                    toast.success(message);
                  } else {
                    toast.error(message);
                  }
                }}
              />
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleCancelModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleConfirmModal(); Navigate('/counselling'); }}
                className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ${
                  !state.purchaseModal.content.isEmployeeVerified
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={!state.purchaseModal.content.isEmployeeVerified}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeStockManagement;
