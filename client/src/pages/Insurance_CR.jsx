import React, {
    useEffect,
    useRef,
    useMemo,
    useState,
    useCallback,
} from "react";
import {
    PrinterIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import supabase from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useGlobalState } from "../context/GlobalStateContext";

const Insurance_CR = ({ isCollapsed }) => {
    const { branch } = useAuth();
    const { state, dispatch, resetState } = useGlobalState();
    const { workOrderForm } = state;

    const {
        step,
        workOrderId,
        productEntries,
        totalAmount,
        submitted,
        gstNumber,
        employee,
        advanceDetails,
        isSaving,
        hasMrNumber,
        mrNumber,
    } = workOrderForm;

    const navigate = useNavigate();
    const [validationErrors, setValidationErrors] = useState({});

    const nextButtonRef = useRef(null);

    // Fetch MR Number from patients table
    const fetchMRNumberFromPatients = useCallback(async (patientDetails) => {
        try {
            const { data, error } = await supabase
                .from("patients")
                .select("mr_number")
                .eq("name", patientDetails.name.trim())
                .eq("phone_number", patientDetails.phoneNumber.trim())
                .single();

            if (error) {
                alert("No MR number found for the provided patient details.");
                return null;
            }

            return data?.mr_number || null;
        } catch (err) {
            console.error("Unexpected error fetching MR number:", err);
            alert("An unexpected error occurred while fetching MR number.");
            return null;
        }
    }, []);

    // Reset form
    const resetForm = useCallback(() => {
        dispatch({ type: "RESET_WORK_ORDER_FORM" });
        setValidationErrors({});
        navigate("/home");
    }, [dispatch, navigate]);

    // Save Work Order to Reception Billing
    const saveWorkOrder = useCallback(async () => {
        try {
            const payload = {
                work_order_id: workOrderId,
                mr_number: mrNumber,
                insurance_name: gstNumber,
                total_amount: totalAmount,
                approved_amount: workOrderForm.approvedAmount,
                employee: employee,
                created_at: new Date().toISOString(),
                branch: branch,
            };

            const { error } = await supabase
                .from("reception_billing")
                .insert(payload);

            if (error) {
                alert("Failed to send work order to reception billing.");
                return;
            }

            alert("Work order sent to reception billing successfully!");
            resetForm();
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An unexpected error occurred while saving the work order.");
        }
    }, [
        branch,
        employee,
        gstNumber,
        mrNumber,
        resetForm,
        totalAmount,
        workOrderForm.approvedAmount,
        workOrderId,
    ]);

    // Navigate to the next step
    const nextStep = useCallback(() => {
        dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: { step: Math.min(step + 1, 4) },
        });
    }, [dispatch, step]);

    // Navigate to the previous step
    const prevStep = useCallback(() => {
        dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: { step: Math.max(step - 1, 1) },
        });
    }, [dispatch, step]);

    // ADDITION: Dynamic employee fetch logic
    const [employees, setEmployees] = useState([]);
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const { data, error } = await supabase
                    .from("employees")
                    .select("name")
                    .eq("branch", branch);

                if (error) {
                    console.error("Error fetching employees:", error.message);
                } else {
                    setEmployees(data.map((emp) => emp.name));
                }
            } catch (err) {
                console.error("Unexpected error fetching employees:", err);
            }
        };

        if (branch) {
            fetchEmployees();
        }
    }, [branch]);

    return (
        <div
            className={`transition-all duration-300 ${
                isCollapsed ? "mx-20" : "mx-20 px-20"
            } justify-center mt-16 p-4 mx-auto`}
        >
            <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
                {step === 4 ? "Finalize Work Order" : "Work Order Generation"}
            </h1>

            {/* Progress Tracker */}
            <div className="flex items-center mb-8 w-2/3 mx-auto">
                {Array.from({ length: 4 }, (_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-2 rounded-xl mx-1 ${
                            step > i + 1 ? "bg-[#5db76d]" : "bg-gray-300"
                        } transition-all duration-300`}
                    />
                ))}
            </div>

            <form
                className="space-y-8 bg-white p-6 rounded-lg max-w-3xl mx-auto"
                onSubmit={(e) => e.preventDefault()}
            >
                {/* Step 01 */}
                {step === 1 && (
                    <div className="bg-gray-50 p-6 rounded-md shadow-inner space-y-6">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Customer Details
                        </h2>
                        <div className="flex items-center space-x-4">
                            <span className="font-medium text-gray-700">
                                Do you have an MR Number?
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    dispatch({
                                        type: "SET_WORK_ORDER_FORM",
                                        payload: { hasMrNumber: true },
                                    })
                                }
                                className={`px-4 py-2 rounded-lg ${
                                    hasMrNumber
                                        ? "bg-green-600 text-white"
                                        : "bg-green-500 text-white hover:bg-green-600"
                                }`}
                            >
                                Yes
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    dispatch({
                                        type: "SET_WORK_ORDER_FORM",
                                        payload: { hasMrNumber: false },
                                    })
                                }
                                className={`px-4 py-2 rounded-lg ${
                                    !hasMrNumber
                                        ? "bg-red-600 text-white"
                                        : "bg-red-500 text-white hover:bg-red-600"
                                }`}
                            >
                                No
                            </button>
                        </div>

                        {hasMrNumber === true && (
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    MR Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter MR Number"
                                    value={mrNumber}
                                    onChange={(e) =>
                                        dispatch({
                                            type: "SET_WORK_ORDER_FORM",
                                            payload: { mrNumber: e.target.value },
                                        })
                                    }
                                    className="border border-gray-300 w-full px-4 py-3 rounded-lg"
                                />
                            </div>
                        )}

                        {hasMrNumber === false && (
                            <>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter Name"
                                        value={workOrderForm.patientDetails?.name || ""}
                                        onChange={(e) =>
                                            dispatch({
                                                type: "SET_WORK_ORDER_FORM",
                                                payload: {
                                                    patientDetails: {
                                                        ...workOrderForm.patientDetails,
                                                        name: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                        className="border border-gray-300 w-full px-4 py-3 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter Phone Number"
                                        value={workOrderForm.patientDetails?.phoneNumber || ""}
                                        onChange={(e) =>
                                            dispatch({
                                                type: "SET_WORK_ORDER_FORM",
                                                payload: {
                                                    patientDetails: {
                                                        ...workOrderForm.patientDetails,
                                                        phoneNumber: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                        className="border border-gray-300 w-full px-4 py-3 rounded-lg"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const fetchedMRNumber = await fetchMRNumberFromPatients(
                                            workOrderForm.patientDetails
                                        );
                                        if (fetchedMRNumber) {
                                            dispatch({
                                                type: "SET_WORK_ORDER_FORM",
                                                payload: { mrNumber: fetchedMRNumber },
                                            });
                                            alert(`MR Number fetched: ${fetchedMRNumber}`);
                                        }
                                    }}
                                    className="mt-4 text-white px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition"
                                >
                                    Fetch MR Number
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Step 02 */}
                {step === 2 && (
                    <div className="bg-gray-50 p-6 rounded-md shadow-inner space-y-6">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Amount Details
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Total Amount
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter Total Amount"
                                    value={workOrderForm.totalAmount || ""}
                                    onChange={(e) =>
                                        dispatch({
                                            type: "SET_WORK_ORDER_FORM",
                                            payload: { totalAmount: e.target.value },
                                        })
                                    }
                                    className="border border-gray-300 w-full px-4 py-3 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Approved Amount
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter Approved Amount"
                                    value={workOrderForm.approvedAmount || ""}
                                    onChange={(e) =>
                                        dispatch({
                                            type: "SET_WORK_ORDER_FORM",
                                            payload: { approvedAmount: e.target.value },
                                        })
                                    }
                                    className="border border-gray-300 w-full px-4 py-3 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 03 */}
                {step === 3 && (
                    <div className="bg-gray-50 p-6 rounded-md shadow-inner space-y-6">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Employee Selection
                        </h2>
                        <div className="space-y-4">
                            <label className="block text-gray-700 font-medium mb-1">
                                Select Employee
                            </label>
                            <select
                                value={employee || ""}
                                onChange={(e) =>
                                    dispatch({
                                        type: "SET_WORK_ORDER_FORM",
                                        payload: { employee: e.target.value },
                                    })
                                }
                                className="border border-gray-300 w-full px-4 py-3 rounded-lg"
                            >
                                <option value="" disabled>
                                    Select Employee
                                </option>
                                {employees.map((emp, idx) => (
                                    <option key={idx} value={emp}>
                                        {emp}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Step 04 */}
                {step === 4 && (
                    <div className="bg-gray-50 p-6 rounded-md shadow-inner space-y-6">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Finalize 
                        </h2>
                        <div className="space-y-4">
                            <p>
                                <strong> ID:</strong> {workOrderId || "N/A"}
                            </p>
                            <p>
                                <strong>MR Number:</strong> {mrNumber || "N/A"}
                            </p>
                            <p>
                                <strong>Total Amount:</strong> ₹
                                {totalAmount?.toFixed(2) || "N/A"}
                            </p>
                            <p>
                                <strong>Approved Amount:</strong> ₹
                                {workOrderForm.approvedAmount || "N/A"}
                            </p>
                            <p>
                                <strong>Insurance Name:</strong> {gstNumber || "N/A"}
                            </p>
                            <p>
                                <strong>Employee:</strong> {employee || "N/A"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={saveWorkOrder}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                        >
                            Send to Reception Billing
                        </button>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-center mt-6 space-x-4">
                    {step > 1 && (
                        <button
                            onClick={prevStep}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                        >
                            Previous
                        </button>
                    )}
                    {step < 5 && (
                        <button
                            ref={nextButtonRef}
                            onClick={nextStep}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                        >
                            Next
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Insurance_CR;
