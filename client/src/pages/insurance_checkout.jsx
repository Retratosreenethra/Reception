// client/src/pages/WorkOrderGeneration.jsx

import React, {
    useEffect,
    useRef,
    useMemo,
    useState,
    useCallback,
  } from "react";
  import {
    CalendarIcon,
    PrinterIcon,
    TrashIcon,
    XMarkIcon,
    ArrowLeftIcon,
  } from "@heroicons/react/24/outline";
  import { useReactToPrint } from "react-to-print"; // <-- for BillPrint usage
  import supabase from "../supabaseClient";
  import { useAuth } from "../context/AuthContext";
  import EmployeeVerification from "../components/EmployeeVerification";
  import { useNavigate, useParams } from "react-router-dom";
  import logo from "../assets/sreenethraenglishisolated.png";
  import { useGlobalState } from "../context/GlobalStateContext";
  
  // Import your BillPrint component
  import BillPrint from "../components/BillPrint";
  
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  
  const formattedDate = `${dd}/${mm}/${yyyy}`;
  
  const formatDate = (date) => {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  
  const Insurance_checkout = ({ isCollapsed }) => {
    const { branch } = useAuth();
    const { orderId } = useParams(); // Get orderId from route params
    const isEditing = Boolean(orderId);
  
    const { state, dispatch, resetState } = useGlobalState();
    const { workOrderForm } = state;
  
    const {
      step,
      workOrderId,
      isPrinted,
      productEntries,
      advanceDetails,
      dueDate,
      mrNumber,
      isPinVerified,
      patientDetails, // we'll continue to use this field for the MR-based details
      employee,
      paymentMethod,
      discount,
      gstNumber,
      isB2B,
      hasMrNumber,
      customerName,
      customerPhone,
      customerAddress,
      customerAge,
      customerGender,
      patient_mr,
      submitted,
      modificationRequestId,
      isSaving,
      allowPrint,
      employees,
      // NEW fields for insurance & reception_billing
      s_idCR, // will store from Step 03
      balancePayment, // will store from Step 04
    } = workOrderForm;
  
    const navigate = useNavigate();
    const setSearchQuery = (query) => {
      dispatch({
        type: "SET_WORK_ORDER_FORM",
        payload: { searchQuery: query },
      });
    };
  
    // Step fields, validation states, and references
    const [productSuggestions, setProductSuggestions] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
  
    const dueDateRef = useRef(null);
    const mrNumberRef = useRef(null);
    const employeeRef = useRef(null);
    const paymentMethodRef = useRef(null);
    const gstNumberRef = useRef(null);
    const advanceDetailsRef = useRef(null);
    const discountRef = useRef(null);
    const printButtonRef = useRef(null);
    const saveButtonRef = useRef(null);
    const nextButtonRef = useRef(null);
    const fetchButtonRef = useRef(null);
    const quantityRefs = useRef([]);
    const yesButtonRef = useRef(null);
    const noButtonRef = useRef(null);
    const customerNameRef = useRef(null);
    const customerPhoneRef = useRef(null);
    const customerAddressRef = useRef(null);
    const customerAgeRef = useRef(null);
    const patient_mrRef = useRef(null);
    const customerGenderRef = useRef(null);
    const backToListButtonRef = useRef(null);
  
    // --- BillPrint ref for printing ---
    const billPrintRef = useRef(null);
  
    // This replaced handlePrint with react-to-print approach
    const handlePrint = useReactToPrint({
      content: () => billPrintRef.current,
      documentTitle: `Work_Order_${workOrderId}`,
      onAfterPrint: () => {
        dispatch({ type: "SET_WORK_ORDER_FORM", payload: { isPrinted: true } });
        resetForm();
      },
    });
    // ----------------------------------
  
    // Generate a new Work Order ID
    const generateNewWorkOrderId = useCallback(async () => {
      try {
        console.log("Attempting to generate new Work Order ID...");
  
        // Define default starting Work Order IDs per branch
        const branchDefaultIds = {
          TVR: 3742,
          NTA: 2309,
          KOT1: 5701,
          KOT2: 6701,
          KAT: 2678,
          // Add other branches as needed
        };
  
        if (!branch) {
          console.error("Branch is undefined. Cannot generate Work Order ID.");
          alert("Branch information is missing. Please try again.");
          return;
        }
  
        // Fetch the last Work Order ID for the current branch
        const { data: lastWorkOrders, error } = await supabase
          .from("work_orders")
          .select("work_order_id")
          .eq("branch", branch)
          .order("work_order_id", { ascending: false })
          .limit(1);
  
        if (error) {
          console.error("Error fetching last work order:", error);
          return;
        }
  
        let newWorkOrderId = branchDefaultIds[branch] || 1001; // default fallback
  
        if (lastWorkOrders && lastWorkOrders.length > 0) {
          const lastWorkOrderId = parseInt(lastWorkOrders[0].work_order_id, 10);
          if (!isNaN(lastWorkOrderId)) {
            newWorkOrderId = lastWorkOrderId + 1;
          }
        }
  
        dispatch({
          type: "SET_WORK_ORDER_FORM",
          payload: { workOrderId: newWorkOrderId.toString() },
        });
        console.log("Generated Work Order ID:", newWorkOrderId);
      } catch (error) {
        console.error("Error generating Work Order ID:", error);
        alert("An unexpected error occurred while generating Work Order ID.");
      }
    }, [dispatch, branch]);
  
    // Fetch employees from supabase
    const fetchEmployees = useCallback(async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("name")
          .eq("branch", branch);
  
        if (error) {
          console.error("Error fetching employees:", error.message);
        } else {
          dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: { employees: data.map((emp) => emp.name) },
          });
        }
      } catch (err) {
        console.error("Unexpected error fetching employees:", err);
      }
    }, [branch, dispatch]);
  
    useEffect(() => {
      if (branch) {
        fetchEmployees();
      }
    }, [branch, fetchEmployees]);
  
    const validateEmployeeSelection = useCallback(() => {
      if (!employee) {
        setValidationErrors((prev) => ({
          ...prev,
          employee: "Employee selection is required.",
        }));
        employeeRef.current?.focus();
      } else {
        setValidationErrors((prev) => {
          const { employee, ...rest } = prev;
          return rest;
        });
      }
    }, [employee]);
  
    const getFinancialYear = useCallback(() => {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
  
      let financialYearStart;
      let financialYearEnd;
  
      if (currentMonth >= 4) {
        financialYearStart = currentYear % 100;
        financialYearEnd = (currentYear + 1) % 100;
      } else {
        financialYearStart = (currentYear - 1) % 100;
        financialYearEnd = currentYear % 100;
      }
  
      return `${financialYearStart}-${financialYearEnd}`;
    }, []);
  
    // Fetch product suggestions
    const fetchProductSuggestions = useCallback(async (query, type) => {
      if (!query) return [];
      try {
        const column = type === "id" ? "product_id" : "product_name";
        const { data, error } = await supabase
          .from("products")
          .select("product_id, product_name, mrp, hsn_code")
          .ilike(column, `%${query}%`)
          .limit(10);
  
        if (error) {
          console.error(`Error fetching ${type} suggestions:`, error.message);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error(`Unexpected error fetching ${type} suggestions:`, err);
        return [];
      }
    }, []);
  
    // Fetch product details
    const fetchProductDetailsFromSupabase = useCallback(async (value, type) => {
      try {
        const column = type === "id" ? "product_id" : "product_name";
        const { data, error } = await supabase
          .from("products")
          .select("product_id, product_name, mrp, hsn_code")
          .eq(column, value);
  
        if (error) {
          console.error(`Error fetching product details by ${type}:`, error.message);
          return null;
        }
  
        return data && data.length > 0 ? data[0] : null;
      } catch (err) {
        console.error(`Unexpected error fetching product details by ${type}:`, err);
        return null;
      }
    }, []);
  
    // Handle product selection
    const handleProductSelection = useCallback(
      async (index, productId) => {
        try {
          const productDetails = await fetchProductDetailsFromSupabase(
            productId,
            "id"
          );
          if (productDetails) {
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: {
                productEntries: productEntries.map((entry, i) =>
                  i === index
                    ? {
                        id: productDetails.product_id,
                        name: productDetails.product_name,
                        price: productDetails.mrp || "",
                        quantity: entry.quantity || "",
                        hsn_code: productDetails.hsn_code || "",
                      }
                    : entry
                ),
              },
            });
            // Focus quantity
            setTimeout(() => {
              quantityRefs.current[index]?.focus();
            }, 100);
          }
        } catch (error) {
          console.error("Error fetching product details:", error);
        }
      },
      [dispatch, productEntries, fetchProductDetailsFromSupabase]
    );
  
    // Handle product input
    const handleProductInput = useCallback(
      async (index, value) => {
        dispatch({
          type: "SET_WORK_ORDER_FORM",
          payload: {
            productEntries: productEntries.map((entry, i) =>
              i === index ? { ...entry, id: value } : entry
            ),
          },
        });
  
        if (value) {
          const suggestions = await fetchProductSuggestions(value, "id");
          setProductSuggestions((prev) => ({
            ...prev,
            [index]: suggestions,
          }));
  
          // If there's an exact match
          if (suggestions.length === 1 && suggestions[0].product_id === value) {
            await handleProductSelection(index, suggestions[0].product_id);
          }
        } else {
          setProductSuggestions((prev) => ({
            ...prev,
            [index]: [],
          }));
        }
      },
      [
        dispatch,
        productEntries,
        fetchProductSuggestions,
        handleProductSelection,
      ]
    );
  
    // Validation handler for product fields
    const validateField = useCallback(
      (index, field) => {
        const errors = { ...validationErrors };
  
        if (field === "id" && !productEntries[index].id) {
          errors[`productId-${index}`] = "Product ID is required";
        } else if (field === "price" && !productEntries[index].price) {
          errors[`productPrice-${index}`] = "Price is required";
        } else if (field === "quantity" && !productEntries[index].quantity) {
          errors[`productQuantity-${index}`] = "Quantity is required";
        } else if (field === "discount" && (isNaN(discount) || discount < 0)) {
          errors[`discount`] = "Enter a valid discount amount (cannot be negative)";
        } else {
          delete errors[`${field}-${index}`];
        }
  
        setValidationErrors(errors);
      },
      [validationErrors, productEntries, discount]
    );
  
    // Reset form
    const resetForm = useCallback(() => {
      dispatch({ type: "RESET_WORK_ORDER_FORM" });
      setProductSuggestions({});
      setValidationErrors({});
      navigate("/home");
    }, [dispatch, navigate]);
  
    // Calculate totals
    const GST_RATE = 12; // 12% total
    const calculateTotals = useCallback((entries, discountAmt) => {
      let subtotal = 0;
      let validDiscountAmount = 0;
      let discountedSubtotal = 0;
      let cgst = 0;
      let sgst = 0;
      let totalAmount = 0;
      let totalAmountWithGST = 0;
      let discountedTotal = 0;
  
      // Subtotal (excluding GST)
      subtotal = entries.reduce((total, product) => {
        const price = parseFloat(product.price) || 0; // MRP incl. GST
        const quantity = parseInt(product.quantity) || 0;
        const basePrice = price / 1.12;
        return total + basePrice * quantity;
      }, 0);
  
      // total incl. GST
      totalAmountWithGST = entries.reduce((total, product) => {
        const price = parseFloat(product.price) || 0;
        const quantity = parseInt(product.quantity) || 0;
        return total + price * quantity;
      }, 0);
  
      // discount
      validDiscountAmount = Math.min(discountAmt || 0, subtotal);
      discountedSubtotal = Math.max(
        (subtotal * 1.12 - validDiscountAmount) / 1.12,
        0
      );
  
      // GST amounts
      cgst = discountedSubtotal * 0.06;
      sgst = discountedSubtotal * 0.06;
  
      // total incl. GST
      totalAmount = discountedSubtotal + cgst + sgst;
      discountedTotal = totalAmountWithGST - validDiscountAmount;
  
      return {
        subtotal,
        discountAmount: validDiscountAmount,
        discountedSubtotal,
        cgst,
        sgst,
        totalAmount,
        totalAmountWithGST,
        discountedTotal,
      };
    }, []);
  
    // Utility for today's date in YYYY-MM-DD
    const getTodayDate = useCallback(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }, []);
  
    // Focus management
    const focusFirstFieldOfStep = useCallback(() => {
      
      if (step === 1) {
        yesButtonRef.current?.focus();
      }
      
      if (step === 2) {
        discountRef.current?.focus();
      }
    }, [step, isB2B]);
  
    useEffect(() => {
      focusFirstFieldOfStep();
    }, [step, isB2B, isEditing, focusFirstFieldOfStep]);
  
    const handleExit = useCallback(() => {
      const confirmExit = window.confirm(
        isPrinted
          ? "Form has been printed. Do you want to exit?"
          : "Are you sure you want to exit without saving or printing?"
      );
      if (confirmExit) {
        resetForm();
        resetState();
      } else {
        dispatch({ type: "SET_WORK_ORDER_FORM", payload: { isPrinted: false } });
      }
    }, [isPrinted, resetForm, resetState, dispatch]);
  
    // Add new product
    const addNewProductEntry = useCallback(() => {
      dispatch({
        type: "SET_WORK_ORDER_FORM",
        payload: {
          productEntries: [
            ...productEntries,
            { id: "", name: "", price: "", quantity: "", hsn_code: "" },
          ],
        },
      });
      setTimeout(() => {
        document.getElementById(`productId-${productEntries.length}`)?.focus();
      }, 0);
    }, [dispatch, productEntries]);
  
    // Remove product
    const removeProductEntry = useCallback(
      (index) => {
        const updatedEntries = productEntries.filter((_, i) => i !== index);
        dispatch({
          type: "SET_WORK_ORDER_FORM",
          payload: { productEntries: updatedEntries },
        });
        setProductSuggestions((prev) => {
          const updatedSuggestions = { ...prev };
          delete updatedSuggestions[index];
          return updatedSuggestions;
        });
      },
      [dispatch, productEntries]
    );
  
    // Memo for totals
    const {
      subtotal = 0,
      discountAmount: validDiscountAmount = 0,
      discountedSubtotal = 0,
      cgst = 0,
      sgst = 0,
      totalAmount = 0,
      totalAmountWithGST = 0,
      discountedTotal = 0,
    } = useMemo(
      () => calculateTotals(productEntries, parseFloat(discount)),
      [productEntries, discount, calculateTotals]
    );
  
    const advance = parseFloat(advanceDetails) || 0;
    const balanceDue = Math.max(totalAmount - advance, 0);
  
    const validateAdvanceAmount = useCallback(() => {
      const advanceAmount = parseFloat(advanceDetails) || 0;
      if (advanceAmount > totalAmount + 1) {
        alert("Advance amount cannot exceed the total amount.");
        return false;
      }
      return true;
    }, [advanceDetails, totalAmount]);
  
    // Step Navigation
    const nextStep = useCallback(() => {
      let errors = {};
  
      if (step === 1) {
        // MR or customer
        if (hasMrNumber === null) {
          errors.hasMrNumber = "Please indicate if you have an MR Number.";
        } else if (hasMrNumber) {
          if (!mrNumber) errors.mrNumber = "MR Number is required.";
        } else {
          if (!customerName) errors.customerName = "Name is required.";
          if (!customerPhone) errors.customerPhone = "Phone number is required.";
          if (!customerAddress) errors.customerAddress = "Address is required.";
          if (!customerAge) errors.customerAge = "Age is required.";
          if (customerAge && parseInt(customerAge) < 0)
            errors.customerAge = "Age cannot be negative.";
          if (!customerGender) errors.customerGender = "Gender is required.";
        }
      }  else if (step === 2) {
        // discount, payment, advance
        if (
          discount &&
          (isNaN(discount) || discount < 0 || parseFloat(discount) > subtotal)
        ) {
          errors.discountAmount =
            "Enter a valid discount amount that does not exceed the subtotal.";
        }
        if (discount === subtotal && advanceDetails !== "0" && advanceDetails !== "") {
          errors.advanceDetails =
            "Advance cannot be collected when discount equals the total amount.";
        }
        if (!paymentMethod) errors.paymentMethod = "Payment method is required.";
        if (!advanceDetails && discount !== subtotal)
          errors.advanceDetails = "Advance details are required.";
      }
  
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        const firstErrorKey = Object.keys(errors)[0];
        if (
          firstErrorKey.startsWith("productId") ||
          firstErrorKey.startsWith("productPrice") ||
          firstErrorKey.startsWith("productQuantity")
        ) {
          const index = firstErrorKey.split("-")[1];
          document.getElementById(firstErrorKey)?.focus();
        } else if (firstErrorKey === "dueDate") {
          dueDateRef.current?.focus();
        } else if (firstErrorKey === "mrNumber") {
          mrNumberRef.current?.focus();
        } else if (firstErrorKey === "gstNumber") {
          gstNumberRef.current?.focus();
        } else if (firstErrorKey === "employee") {
          employeeRef.current?.focus();
        } else if (firstErrorKey === "paymentMethod") {
          paymentMethodRef.current?.focus();
        } else if (firstErrorKey === "advanceDetails") {
          advanceDetailsRef.current?.focus();
        } else if (firstErrorKey === "discountAmount") {
          discountRef.current?.focus();
        } else if (firstErrorKey === "hasMrNumber") {
          yesButtonRef.current?.focus();
        } else if (firstErrorKey === "customerName") {
          customerNameRef.current?.focus();
        } else if (firstErrorKey === "customerPhone") {
          customerPhoneRef.current?.focus();
        } else if (firstErrorKey === "customerAddress") {
          customerAddressRef.current?.focus();
        } else if (firstErrorKey === "customerAge") {
          customerAgeRef.current?.focus();
        } else if (firstErrorKey === "customerGender") {
          customerGenderRef.current?.focus();
        }
        return;
      }
  
      // no errors
      setValidationErrors({});
      if (step < 5) {
        dispatch({ type: "SET_WORK_ORDER_FORM", payload: { step: step + 1 } });
      }
    }, [
      step,
      productEntries,
      dueDate,
      hasMrNumber,
      mrNumber,
      customerName,
      customerPhone,
      customerAddress,
      customerAge,
      customerGender,
      employee,
      isPinVerified,
      isB2B,
      gstNumber,
      discount,
      subtotal,
      advanceDetails,
      paymentMethod,
      dispatch,
    ]);
  
    // Save Work Order
    const saveWorkOrder = useCallback(async () => {
      if (isSaving) {
        alert("Please wait while the work order is being saved.");
        return;
      }
      if (submitted) {
        alert("Work order submitted already");
        return;
      }
  
      dispatch({ type: "SET_WORK_ORDER_FORM", payload: { isSaving: true } });
  
      // Validate advance
      if (!validateAdvanceAmount()) {
        dispatch({ type: "SET_WORK_ORDER_FORM", payload: { isSaving: false } });
        return;
      }
  
      // Basic validations
      const validations = [
        {
          condition: !employee,
          errorKey: "employee",
          message: "Employee selection is required.",
          ref: employeeRef,
        },
        {
          condition: isB2B && !gstNumber,
          errorKey: "gstNumber",
          message: "GST Number is required for B2B orders.",
          ref: gstNumberRef,
        },
        {
          condition:
            discount &&
            (isNaN(discount) || discount < 0 || parseFloat(discount) > subtotal),
          errorKey: "discountAmount",
          message:
            "Enter a valid discount amount that does not exceed the subtotal.",
          ref: discountRef,
        },
        {
          condition:
            discount === subtotal &&
            advanceDetails !== "0" &&
            advanceDetails !== "",
          errorKey: "advanceDetails",
          message:
            "Advance cannot be collected when discount equals the total amount.",
          ref: advanceDetailsRef,
        },
        {
          condition: !paymentMethod,
          errorKey: "paymentMethod",
          message: "Payment method is required.",
          ref: paymentMethodRef,
        },
      ];
  
      for (const validation of validations) {
        if (validation.condition) {
          setValidationErrors((prev) => ({
            ...prev,
            [validation.errorKey]: validation.message,
          }));
          validation.ref?.current?.focus();
          dispatch({ type: "SET_WORK_ORDER_FORM", payload: { isSaving: false } });
          return;
        }
      }
  
      // Validate product
      const productErrors = {};
      productEntries.forEach((product, index) => {
        if (!product.id)
          productErrors[`productId-${index}`] = "Product ID is required.";
        if (!product.price)
          productErrors[`productPrice-${index}`] = "Price is required.";
        if (!product.quantity)
          productErrors[`productQuantity-${index}`] = "Quantity is required.";
      });
  
      if (step === 1) {
        if (hasMrNumber === null) {
          productErrors["hasMrNumber"] = "Please indicate if you have an MR Number.";
        } else if (hasMrNumber) {
          if (!mrNumber) productErrors["mrNumber"] = "MR Number is required.";
        } else {
          if (!customerName) productErrors["customerName"] = "Name is required.";
          if (!customerPhone)
            productErrors["customerPhone"] = "Phone number is required.";
          if (!customerAddress)
            productErrors["customerAddress"] = "Address is required.";
          if (!customerAge) productErrors["customerAge"] = "Age is required.";
          if (customerAge && parseInt(customerAge) < 0)
            productErrors["customerAge"] = "Age cannot be negative.";
          if (!customerGender)
            productErrors["customerGender"] = "Gender is required.";
        }
      }
  
      if (Object.keys(productErrors).length > 0) {
        setValidationErrors(productErrors);
        const firstErrorKey = Object.keys(productErrors)[0];
        if (
          firstErrorKey.startsWith("productId") ||
          firstErrorKey.startsWith("productPrice") ||
          firstErrorKey.startsWith("productQuantity")
        ) {
          const index = firstErrorKey.split("-")[1];
          document.getElementById(firstErrorKey)?.focus();
        } else if (firstErrorKey === "dueDate") {
          dueDateRef.current?.focus();
        } else if (firstErrorKey === "mrNumber") {
          mrNumberRef.current?.focus();
        } else if (firstErrorKey === "gstNumber") {
          gstNumberRef.current?.focus();
        } else if (firstErrorKey === "employee") {
          employeeRef.current?.focus();
        } else if (firstErrorKey === "paymentMethod") {
          paymentMethodRef.current?.focus();
        } else if (firstErrorKey === "advanceDetails") {
          advanceDetailsRef.current?.focus();
        } else if (firstErrorKey === "discountAmount") {
          discountRef.current?.focus();
        } else if (firstErrorKey === "hasMrNumber") {
          yesButtonRef.current?.focus();
        } else if (firstErrorKey === "customerName") {
          customerNameRef.current?.focus();
        } else if (firstErrorKey === "customerPhone") {
          customerPhoneRef.current?.focus();
        } else if (firstErrorKey === "customerAddress") {
          customerAddressRef.current?.focus();
        } else if (firstErrorKey === "customerAge") {
          customerAgeRef.current?.focus();
        } else if (firstErrorKey === "customerGender") {
          customerGenderRef.current?.focus();
        }
        dispatch({ type: "SET_WORK_ORDER_FORM", payload: { isSaving: false } });
        return;
      }
  
      // Clear errors
      setValidationErrors({});
  
      try {
        let customerId = null;
        if (hasMrNumber) {
          // fetch existing patient
          const { data: existingCustomer, error: customerError } = await supabase
            .from("patients")
            .select("id")
            .eq("mr_number", mrNumber.trim())
            .single();
  
          if (customerError) {
            alert("No valid customer found with the provided MR Number.");
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { isSaving: false },
            });
            return;
          }
          customerId = null; // or store if needed
        } else {
          // Create new patient
          const { data: newCustomer, error: customerCreationError } =
            await supabase
              .from("patients")
              .insert({
                name: customerName.trim(),
                phone_number: customerPhone.trim(),
                address: customerAddress.trim(),
                age: parseInt(customerAge, 10),
                gender: customerGender,
                mr_number: patient_mr,
              })
              .select("customer_id")
              .single();
  
          if (customerCreationError) {
            console.error("Error creating customer:", customerCreationError.message);
            alert("Failed to create a new customer.");
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { isSaving: false },
            });
            return;
          }
          customerId = newCustomer?.customer_id;
        }
  
        // Prepare payload
        let payload = {
          product_entries: productEntries.map((entry) => ({
            product_id: entry.id,
            product_name: entry.name,
            price: parseFloat(entry.price),
            quantity: parseInt(entry.quantity),
            hsn_code: entry.hsn_code,
          })),
          advance_details: advance,
          due_date: dueDate,
          mr_number: hasMrNumber ? mrNumber : null,
          patient_details: hasMrNumber
            ? {
                mr_number: mrNumber.trim(),
                name: patientDetails?.name || "",
                age: patientDetails?.age || "",
                phone_number: patientDetails?.phoneNumber || "",
                gender: patientDetails?.gender || "",
                address: patientDetails?.address || "",
              }
            : {
                name: customerName.trim(),
                phone_number: customerPhone.trim(),
                address: customerAddress.trim(),
                age: parseInt(customerAge, 10),
                gender: customerGender,
              },
          employee: workOrderForm.employee,
          payment_method: paymentMethod,
          subtotal,
          discount_amount: validDiscountAmount,
          discounted_subtotal: discountedSubtotal,
          cgst,
          sgst,
          total_amount: totalAmountWithGST,
          is_b2b: isB2B,
          gst_number: isB2B ? gstNumber : null,
          updated_at: new Date().toISOString(),
          branch: branch,
          customer_id: customerId,
          discounted_total: discountedTotal,
          amount_due: balanceDue,
        };
  
        if (isEditing) {
          payload.work_order_id = workOrderId;
          const { error } = await supabase
            .from("work_orders")
            .update(payload)
            .eq("work_order_id", workOrderId);
  
          if (error) {
            if (error.status === 409) {
              alert("Work Order ID already exists. Generating a new ID...");
              await generateNewWorkOrderId();
              await saveWorkOrder();
            } else {
              alert("Failed to update work order.");
            }
          } else {
            alert("Work order updated successfully!");
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { allowPrint: true, submitted: true },
            });
  
            // Check for modification requests
            try {
              const { data: modReqData, error: modReqError } = await supabase
                .from("modification_requests")
                .select("id, status")
                .eq("order_id", workOrderId)
                .eq("order_type", "work_order")
                .in("status", ["approved", "pending"])
                .order("id", { ascending: false })
                .limit(1);
  
              if (modReqError) {
                console.error("Error fetching modification request:", modReqError.message);
                alert(
                  "Failed to fetch modification request. Please contact support."
                );
              } else if (modReqData && modReqData.length > 0) {
                const modificationRequest = modReqData[0];
                // Update status
                const { error: modificationError } = await supabase
                  .from("modification_requests")
                  .update({ status: "completed", updated_at: new Date().toISOString() })
                  .eq("id", modificationRequest.id);
  
                if (modificationError) {
                  console.error(
                    "Error updating modification request status:",
                    modificationError.message
                  );
                  alert(
                    "Work order was updated, but failed to update modification request status."
                  );
                } else {
                  console.log("Modification request status updated to 'completed'.");
                  alert("Modification request completed successfully.");
                }
              }
            } catch (err) {
              console.error("Unexpected error updating modification request:", err);
              alert(
                "An unexpected error occurred while updating modification request status."
              );
            }
          }
        } else {
          // Insert new
          if (!workOrderId) {
            alert("Work Order ID is not generated yet. Please wait.");
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { isSaving: false },
            });
            return;
          }
          payload.work_order_id = workOrderId;
          payload.created_at = new Date().toISOString();
  
          const { error } = await supabase.from("work_orders").insert(payload);
  
          if (error) {
            if (error.status === 409) {
              alert("Work Order ID already exists. Please try saving again.");
              await generateNewWorkOrderId();
            } else {
              alert("Failed to save work order.");
            }
          } else {
            alert("Work order saved successfully!");
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { allowPrint: true, submitted: true },
            });
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        alert("An unexpected error occurred while saving the work order.");
      } finally {
        dispatch({ type: "SET_WORK_ORDER_FORM", payload: { isSaving: false } });
      }
    }, [
      isSaving,
      dispatch,
      validateAdvanceAmount,
      employee,
      isB2B,
      submitted,
      gstNumber,
      discount,
      subtotal,
      advanceDetails,
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress,
      customerAge,
      customerGender,
      hasMrNumber,
      mrNumber,
      patientDetails,
      productEntries,
      validDiscountAmount,
      discountedSubtotal,
      cgst,
      sgst,
      totalAmount,
      workOrderId,
      isEditing,
      generateNewWorkOrderId,
      modificationRequestId,
      balanceDue,
    ]);
  
    // Prev step
    const prevStep = useCallback(() => {
      dispatch({
        type: "SET_WORK_ORDER_FORM",
        payload: { step: Math.max(step - 1, 1) },
      });
    }, [dispatch, step]);
  
    // -------------------------------
    // STEP 02: handle MR number search
    // -------------------------------
    const handleMRNumberSearch = useCallback(async () => {
      if (!mrNumber.trim()) {
        alert("Please enter a valid MR Number.");
        mrNumberRef.current?.focus();
        return;
      }
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, age, mr_number, phone_number, name, gender, address")
          .eq("mr_number", mrNumber.trim())
          .single();
  
        if (error) {
          if (error.code === "PGRST116") {
            // no data
            alert("No patient found with the provided MR Number.");
          } else {
            console.error("Error fetching patient details:", error.message);
            alert("Failed to fetch patient details.");
          }
          dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: { patientDetails: null },
          });
          return;
        }
  
        if (data) {
          // store in patientDetails
          dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: {
              patientDetails: {
                name: data.name,
                age: data.age,
                phoneNumber: data.phone_number,
                gender: data.gender,
                address: data.address,
                mr_number: data.mr_number,
              },
            },
          });
          // jump to next button
          setTimeout(() => {
            nextButtonRef.current?.focus();
          }, 0);
        }
      } catch (err) {
        console.error("Unexpected error fetching patient details:", err);
        alert("An unexpected error occurred while fetching patient details.");
        dispatch({
          type: "SET_WORK_ORDER_FORM",
          payload: { patientDetails: null },
        });
      }
    }, [mrNumber, dispatch, nextButtonRef]);
  
    // -------------------------------
    // STEP 03: fetch s_idCR from insurance (once MR is known)
    // -------------------------------
    useEffect(() => {
      if (!mrNumber.trim()) return;
      const fetchSIDCR = async () => {
        try {
          const { data, error } = await supabase
            .from("insurance")
            .select("s_idCR")
            .eq("mr_number", mrNumber.trim())
            .single();
  
          if (error) {
            console.error("Error fetching s_idCR:", error.message);
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { s_idCR: null },
            });
          } else {
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { s_idCR: data.s_idCR || null },
            });
          }
        } catch (err) {
          console.error("Unexpected error fetching s_idCR:", err);
          dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: { s_idCR: null },
          });
        }
      };
      fetchSIDCR();
    }, [mrNumber, dispatch]);
  
    // -------------------------------
    // STEP 04: Calculate Balance Payment from reception_billing
    // balancePayment = totalAmount - approved_amount
    // -------------------------------
    useEffect(() => {
      if (!workOrderForm.s_idCR) return;
      const fetchApprovedAmountAndCalculateBalance = async () => {
        try {
          const { data, error } = await supabase
            .from("reception_billing")
            .select("approved_amount")
            .eq("s_idCR", workOrderForm.s_idCR)
            .single();
  
          if (error) {
            console.error("Error fetching approved_amount:", error.message);
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { balancePayment: 0 },
            });
          } else {
            const approved_amount = data?.approved_amount || 0;
            const newBalance = totalAmount - approved_amount;
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { balancePayment: newBalance },
            });
          }
        } catch (err) {
          console.error("Unexpected error fetching approved_amount:", err);
          dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: { balancePayment: 0 },
          });
        }
      };
      fetchApprovedAmountAndCalculateBalance();
    }, [workOrderForm.s_idCR, totalAmount, dispatch]);
  
    // discount field
    const handleDiscountInput = useCallback(
      (e) => {
        let value = e.target.value.replace(/^0+/, "");
        if (!value) value = "";
        const numericValue = Math.min(
          Math.max(parseFloat(value) || 0, 0),
          subtotal
        );
        dispatch({
          type: "SET_WORK_ORDER_FORM",
          payload: { discount: numericValue.toString() },
        });
      },
      [dispatch, subtotal]
    );
  
    // handleEnterKey
    const handleEnterKey = useCallback(
      (e, nextFieldRef, action) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (nextFieldRef) {
            nextFieldRef.current?.focus();
          } else if (action) {
            action();
          } else {
            nextStep();
          }
        }
      },
      [nextStep]
    );
  
    // Fetch existing for editing
    const fetchWorkOrderDetails = useCallback(async () => {
      try {
        const { data, error } = await supabase
          .from("work_orders")
          .select("*")
          .eq("work_order_id", orderId)
          .single();
  
        if (error) {
          console.error("Error fetching work order details:", error.message);
          alert("Failed to fetch work order details.");
          navigate("/home");
        } else {
          const formattedProductEntries = data.product_entries.map((entry) => ({
            id: entry.product_id,
            name: entry.product_name,
            price: entry.price.toString(),
            quantity: entry.quantity.toString(),
            hsn_code: entry.hsn_code,
          }));
  
          dispatch({
            type: "SET_WORK_ORDER_FORM",
            payload: {
              workOrderId: data.work_order_id,
              productEntries:
                formattedProductEntries.length > 0
                  ? formattedProductEntries
                  : [{ id: "", name: "", price: "", quantity: "", hsn_code: "" }],
              advanceDetails: data.advance_details || "",
              dueDate: data.due_date || "",
              discount: data.discount_amount ? data.discount_amount.toString() : "",
              paymentMethod: data.payment_method || "",
              isB2B: data.is_b2b || false,
              gstNumber: data.gst_number || "",
              employee: data.employee || "",
              hasMrNumber: data.mr_number ? true : false,
              modificationRequestId: data.modification_request_id || null,
            },
          });
  
          if (data.mr_number) {
            dispatch({
              type: "SET_WORK_ORDER_FORM",
              payload: { mrNumber: data.mr_number },
            });
            // fetch patient details
            try {
              const { data: patientData, error: patientError } = await supabase
                .from("patients")
                .select("name, age, phone_number, gender, address")
                .eq("mr_number", data.mr_number)
                .single();
  
              if (patientError) {
                console.error(
                  "Error fetching patient details:",
                  patientError.message
                );
                dispatch({
                  type: "SET_WORK_ORDER_FORM",
                  payload: { patientDetails: null },
                });
              } else {
                dispatch({
                  type: "SET_WORK_ORDER_FORM",
                  payload: {
                    patientDetails: {
                      name: patientData.name,
                      age: patientData.age,
                      phoneNumber: patientData.phone_number,
                      gender: patientData.gender,
                      address: patientData.address,
                      mr_number: data.mr_number,
                    },
                  },
                });
              }
            } catch (err) {
              console.error("Unexpected error fetching patient details:", err);
              dispatch({
                type: "SET_WORK_ORDER_FORM",
                payload: { patientDetails: null },
              });
            }
          } else if (data.customer_id) {
            // existing customer
            const { data: customerData, error: customerError } = await supabase
              .from("patients")
              .select("name, phone_number, address, age, gender")
              .eq("customer_id", data.customer_id)
              .single();
  
            if (customerError) {
              console.error("Error fetching customer details:", customerError.message);
              dispatch({
                type: "SET_WORK_ORDER_FORM",
                payload: { customerDetails: null },
              });
            } else {
              dispatch({
                type: "SET_WORK_ORDER_FORM",
                payload: {
                  customerName: customerData.name,
                  customerPhone: customerData.phone_number,
                  customerAddress: customerData.address,
                  customerAge: customerData.age ? customerData.age.toString() : "",
                  customerGender: customerData.gender || "",
                },
              });
            }
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching work order details:", err);
        alert("An unexpected error occurred while fetching work order details.");
        navigate("/home");
      }
    }, [dispatch, navigate, orderId]);
  
    useEffect(() => {
      if (branch && !workOrderForm.isEditing && !workOrderId) {
        generateNewWorkOrderId();
      }
    }, [branch, generateNewWorkOrderId, workOrderForm.isEditing, workOrderId]);
  
    useEffect(() => {
      if (isEditing) {
        fetchWorkOrderDetails();
      }
    }, [isEditing, fetchWorkOrderDetails]);
  
    // After print
    useEffect(() => {
      const handleAfterPrint = () => {
        if (isPrinted) {
          resetForm();
        }
      };
      window.onafterprint = handleAfterPrint;
      return () => {
        window.onafterprint = null;
      };
    }, [isPrinted, resetForm]);
  
    return (
      <div
        className={`transition-all duration-300 ${
          isCollapsed ? "mx-20" : "mx-20 px-20"
        } justify-center mt-16 p-4 mx-auto`}
      >
        <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          {isEditing ? "Edit Work Order" : "Work Order Generation"}
        </h1>
  
        {/* Progress Tracker */}
        <div className=" flex items-center mb-8 w-2/3 mx-auto">
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
          {/* Step 1 */}
         
  
          {/* Step 2 */}
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
                  onClick={() => {
                    dispatch({
                      type: "SET_WORK_ORDER_FORM",
                      payload: { hasMrNumber: true },
                    });
                    setValidationErrors((prev) => {
                      const { hasMrNumber, ...rest } = prev;
                      return rest;
                    });
                    setTimeout(() => {
                      mrNumberRef.current?.focus();
                    }, 0);
                  }}
                  ref={yesButtonRef}
                  className={`px-4 py-2 rounded-lg focus:outline-none ${
                    hasMrNumber === true
                      ? "bg-green-600 text-white"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                  aria-pressed={hasMrNumber === true}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: "SET_WORK_ORDER_FORM",
                      payload: { hasMrNumber: false },
                    });
                    setValidationErrors((prev) => {
                      const { hasMrNumber, ...rest } = prev;
                      return rest;
                    });
                    setTimeout(() => {
                      customerNameRef.current?.focus();
                    }, 0);
                  }}
                  ref={noButtonRef}
                  className={`px-4 py-2 rounded-lg focus:outline-none ${
                    hasMrNumber === false
                      ? "bg-red-600 text-white"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                  aria-pressed={hasMrNumber === false}
                >
                  No
                </button>
              </div>
              {validationErrors.hasMrNumber && (
                <p className="text-red-500 text-xs mt-1">
                  {validationErrors.hasMrNumber}
                </p>
              )}
  
              {hasMrNumber ? (
                <>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      MR Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter MR Number of Customer"
                      value={mrNumber}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_WORK_ORDER_FORM",
                          payload: {
                            mrNumber: e.target.value,
                            patientDetails: null,
                          },
                        })
                      }
                      onKeyDown={(e) => handleEnterKey(e, fetchButtonRef)}
                      ref={mrNumberRef}
                      className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                        validationErrors.mrNumber ? "border-red-500" : ""
                      }`}
                      aria-label="Enter MR Number"
                    />
                    {validationErrors.mrNumber && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.mrNumber}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleMRNumberSearch}
                    ref={fetchButtonRef}
                    className="mt-2 text-white px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition"
                  >
                    Fetch Customer Details
                  </button>
                  {patientDetails && (
                    <div className="mt-4 bg-gray-100 p-4 rounded border border-gray-200">
                      <p>
                        <strong>Name:</strong> {patientDetails.name || "N/A"}
                      </p>
                      <p>
                        <strong>Age:</strong> {patientDetails.age || "N/A"}
                      </p>
                      <p>
                        <strong>Phone Number:</strong>{" "}
                        {patientDetails.phoneNumber || "N/A"}
                      </p>
                      <p>
                        <strong>Gender:</strong> {patientDetails.gender || "N/A"}
                      </p>
                      <p>
                        <strong>Address:</strong>{" "}
                        {patientDetails.address || "N/A"}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Name"
                      value={customerName}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_WORK_ORDER_FORM",
                          payload: { customerName: e.target.value },
                        })
                      }
                      onKeyDown={(e) => handleEnterKey(e, customerPhoneRef)}
                      ref={customerNameRef}
                      className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                        validationErrors.customerName ? "border-red-500" : ""
                      }`}
                      aria-label="Enter Name"
                    />
                    {validationErrors.customerName && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.customerName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_WORK_ORDER_FORM",
                          payload: { customerPhone: e.target.value },
                        })
                      }
                      onKeyDown={(e) => handleEnterKey(e, customerAddressRef)}
                      ref={customerPhoneRef}
                      className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                        validationErrors.customerPhone ? "border-red-500" : ""
                      }`}
                      aria-label="Enter Phone Number"
                    />
                    {validationErrors.customerPhone && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.customerPhone}
                      </p>
                    )}
                  </div>
  
                  {/* patient_mr if needed */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      MR Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter MR Number"
                      value={patient_mr}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_WORK_ORDER_FORM",
                          payload: { patient_mr: e.target.value },
                        })
                      }
                      onKeyDown={(e) => handleEnterKey(e, customerAddressRef)}
                      ref={patient_mrRef}
                      className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                        validationErrors.patient_mr ? "border-red-500" : ""
                      }`}
                      aria-label="Enter MR Number"
                    />
                    {validationErrors.patient_mr && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.patient_mr}
                      </p>
                    )}
                  </div>
  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Address"
                      value={customerAddress}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_WORK_ORDER_FORM",
                          payload: { customerAddress: e.target.value },
                        })
                      }
                      onKeyDown={(e) => handleEnterKey(e, customerAgeRef)}
                      ref={customerAddressRef}
                      className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                        validationErrors.customerAddress ? "border-red-500" : ""
                      }`}
                      aria-label="Enter Address"
                    />
                    {validationErrors.customerAddress && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.customerAddress}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      placeholder="Enter Age"
                      value={customerAge}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_WORK_ORDER_FORM",
                          payload: { customerAge: e.target.value },
                        })
                      }
                      onKeyDown={(e) => handleEnterKey(e, customerGenderRef)}
                      ref={customerAgeRef}
                      className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                        validationErrors.customerAge ? "border-red-500" : ""
                      }`}
                      aria-label="Enter Age"
                    />
                    {validationErrors.customerAge && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.customerAge}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Gender
                    </label>
                    <select
                      value={customerGender}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_WORK_ORDER_FORM",
                          payload: { customerGender: e.target.value },
                        })
                      }
                      onKeyDown={(e) => handleEnterKey(e, nextButtonRef)}
                      ref={customerGenderRef}
                      className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                        validationErrors.customerGender ? "border-red-500" : ""
                      }`}
                      aria-label="Select Gender"
                    >
                      <option value="" disabled>
                        Select Gender
                      </option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {validationErrors.customerGender && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.customerGender}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
  
          {/* Step 3 */}
          
  
          {/* Step 4 */}
          {step === 2 && (
            <>
              {/* Bill Preview (still visible on screen) */}
              <div className=" bg-white rounded-lg text-gray-800">
                <div className="printable-area print:mt-20 print:block print:absolute print:inset-0 print:w-full bg-white p-4 print:m-0 print:p-0 w-full">
                  {/* Header */}
                  <div className=" flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <h2 className="text-3xl font-bold">
                        {isEditing ? "Work Order (Modified)" : "Tax Invoice"}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p>
                        Date: <strong>{formattedDate}</strong>
                      </p>
                      <p>
                        Sales Order No:<strong> {workOrderId}</strong>
                      </p>
                      {hasMrNumber && (
                        <p>
                          MR Number:<strong> {mrNumber}</strong>
                        </p>
                      )}
                    </div>
                  </div>
  
                  {/* Customer */}
                  <div className="mb-6">
                    <p>
                      Name:{" "}
                      <strong>
                        {hasMrNumber
                          ? `${patientDetails?.name || "N/A"} | ${
                              patientDetails?.age || "N/A"
                            } | ${patientDetails?.gender || "N/A"}`
                          : `${customerName || "N/A"} | ${customerAge || "N/A"} | ${
                              customerGender || "N/A"
                            }`}
                      </strong>
                    </p>
                    <p>
                      Address:
                      <strong>
                        {hasMrNumber
                          ? patientDetails?.address || "N/A"
                          : customerAddress || "N/A"}
                      </strong>
                    </p>
                    <p>
                      Phone:
                      <strong>
                        {hasMrNumber
                          ? patientDetails?.phoneNumber || "N/A"
                          : customerPhone || "N/A"}
                      </strong>
                    </p>
                  </div>
  
                  {/* Product Table */}
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr>
                        <th className="border px-4 py-2">#</th>
                        <th className="border px-4 py-2">Product ID</th>
                        <th className="border px-4 py-2">Product Name</th>
                        <th className="border px-4 py-2">HSN Code</th>
                        <th className="border px-4 py-2">Price</th>
                        <th className="border px-4 py-2">Quantity</th>
                        <th className="border px-4 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productEntries.map((product, index) => {
                        const adjustedPrice = parseFloat(product.price) || 0;
                        const adjustedSubtotal =
                          adjustedPrice * (parseInt(product.quantity) || 0);
                        return (
                          <tr key={index}>
                            <td className="border px-4 py-2 text-center">
                              {index + 1}
                            </td>
                            <td className="border px-4 py-2 text-center">
                              {product.id || "N/A"}
                            </td>
                            <td className="border px-4 py-2">
                              {product.name || "N/A"}
                            </td>
                            <td className="border px-4 py-2 text-center">
                              {product.hsn_code || "N/A"}
                            </td>
                            <td className="border px-4 py-2 text-center">
                              ₹{adjustedPrice.toFixed(2)}
                            </td>
                            <td className="border px-4 py-2 text-center">
                              {product.quantity || "N/A"}
                            </td>
                            <td className="border px-4 py-2 text-center">
                              ₹{adjustedSubtotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
  
                  {/* Financial Summary */}
                  <div className="flex justify-between mb-6 space-x-8">
                    <div>
                      <p>
                        Payment Method:
                        <strong>
                          {" "}
                          {paymentMethod
                            ? paymentMethod.charAt(0).toUpperCase() +
                              paymentMethod.slice(1)
                            : "N/A"}
                        </strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p>
                        Advance Paid:<strong> ₹{advance.toFixed(2)}</strong>
                      </p>
                      <p className="text-xl">
                        <strong>Total Amount ₹{discountedTotal.toFixed(2)}</strong>
                      </p>
                      <p className="text-xl">
                        <strong>Amount Due: ₹{balanceDue.toFixed(2)}</strong>
                      </p>
  
                      {/* Step 04: Insurance Balance Payment */}
                      <p className="text-xl text-blue-700">
                        <strong>
                          Insurance Balance Pay: ₹
                          {(balancePayment || 0).toFixed(2)}
                        </strong>
                      </p>
  
                      <div className="mt-10 space-x-8">
                        <p>
                          Billed by:<strong> {employee || "N/A"}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
  
                  {/* Input Fields for discount, payment, advance */}
                  <div className="print:hidden flex flex-col md:flex-row items-center justify-between my-6 space-x-4">
                    <div className="w-full print:w-1/3 mb-4 md:mb-0">
                      <label
                        htmlFor="discount"
                        className="block font-semibold mb-1"
                      >
                        Discount:
                      </label>
                      <input
                        type="number"
                        id="discount"
                        placeholder="Enter discount Amount"
                        value={discount || ""}
                        onChange={handleDiscountInput}
                        onKeyDown={(e) => handleEnterKey(e, paymentMethodRef)}
                        ref={discountRef}
                        className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                          validationErrors.discount ? "border-red-500" : ""
                        }`}
                        aria-label="Enter Discount Amount"
                      />
                      {validationErrors.discount && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.discount}
                        </p>
                      )}
                    </div>
  
                    <div className="w-full print:w-1/3 mb-4 md:mb-0">
                      <label
                        htmlFor="paymentMethod"
                        className="block font-semibold mb-1"
                      >
                        Payment Method:
                      </label>
                      <select
                        id="paymentMethod"
                        value={paymentMethod}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_WORK_ORDER_FORM",
                            payload: { paymentMethod: e.target.value },
                          })
                        }
                        ref={paymentMethodRef}
                        onKeyDown={(e) => handleEnterKey(e, advanceDetailsRef)}
                        className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                          validationErrors.paymentMethod ? "border-red-500" : ""
                        }`}
                      >
                        <option value="" disabled>
                          Select Payment Method
                        </option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="online">UPI (Paytm/PhonePe/GPay)</option>
                      </select>
                      {validationErrors.paymentMethod && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.paymentMethod}
                        </p>
                      )}
                    </div>
  
                    <div className="w-full print:w-1/3 mb-4 md:mb-0">
                      <label
                        htmlFor="advanceDetails"
                        className="block font-semibold mb-1"
                      >
                        Advance Paying:
                      </label>
                      <input
                        type="number"
                        id="advanceDetails"
                        placeholder="Enter amount paid in advance"
                        value={advanceDetails}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_WORK_ORDER_FORM",
                            payload: { advanceDetails: e.target.value },
                          })
                        }
                        onKeyDown={(e) => handleEnterKey(e, saveButtonRef)}
                        ref={advanceDetailsRef}
                        className={`border border-gray-300 w-full px-4 py-3 rounded-lg ${
                          validationErrors.advanceDetails ? "border-red-500" : ""
                        }`}
                        aria-label="Enter Advance Amount"
                      />
                      {validationErrors.advanceDetails && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.advanceDetails}
                        </p>
                      )}
                    </div>
                  </div>
  
                  {/* Footer Section */}
                  <div className="flex-col justify-start mx-auto items-start text-left text-md">
                    <p className="mt-2 text-md">
                      Delivery On:
                      <strong> {dueDate ? formatDate(dueDate) : "N/A"}</strong>
                    </p>
                    {isB2B && (
                      <p>
                        <strong>GST Number of work assigning:</strong>{" "}
                        {gstNumber || "N/A"}
                      </p>
                    )}
                    <p className="mt-2 text-xs">
                      Terms and Conditions:
                      <ol className="list-decimal list-inside">
                        <li>Work order valid only for two months.</li>
                        <li>
                          Branded Frames/Lenses – 12 Months warranty for
                          manufacturing defects/peeling off.
                        </li>
                      </ol>
                    </p>
                  </div>
                </div>
              </div>
  
              {/* Buttons */}
              <div className="flex justify-center text-center space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSaving && !submitted) saveWorkOrder();
                  }}
                  ref={saveButtonRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!isSaving) {
                        saveWorkOrder();
                        setTimeout(() => {
                          printButtonRef.current?.focus();
                        }, 100);
                      }
                    }
                  }}
                  className="flex items-center justify-center w-44 h-12 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  disabled={isSaving || submitted}
                >
                  {isSaving
                    ? "Saving..."
                    : submitted
                    ? "Order Submitted"
                    : "Save Work Order"}
                </button>
  
                {allowPrint && (
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({
                        type: "SET_WORK_ORDER_FORM",
                        payload: { isPrinted: true },
                      });
                      handlePrint(); // now uses BillPrint ref
                    }}
                    ref={printButtonRef}
                    className="flex items-center justify-center w-44 h-12 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    <PrinterIcon className="w-5 h-5 mr-2" />
                    Print
                  </button>
                )}
  
                {allowPrint && (
                  <button
                    type="button"
                    onClick={handleExit}
                    className="flex items-center justify-center w-44 h-12 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    <XMarkIcon className="w-5 h-5 mr-2" />
                    Exit
                  </button>
                )}
              </div>
            </>
          )}
  
          {/* Navigation Buttons */}
          <div className="flex justify-center mt-6">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="bg-green-500 hover:bg-green-600 text-white mx-2 px-4 py-2 rounded-lg"
              >
                Previous
              </button>
            )}
            {step < 5 && (
              <button
                ref={nextButtonRef}
                onClick={nextStep}
                className="bg-green-500 hover:bg-green-600 text-white mx-2 px-4 py-2 rounded-lg"
              >
                Next
              </button>
            )}
          </div>
        </form>
  
        {/* STEP 05: BillPrint component hidden, used by react-to-print */}
        <div style={{ display: "none" }}>
          <BillPrint
            ref={billPrintRef}
            workOrderId={workOrderId}
            dueDate={dueDate}
            productEntries={productEntries}
            employee={employee}
            isB2B={isB2B}
            gstNumber={gstNumber}
            subtotal={subtotal}
            discountAmount={validDiscountAmount}
            discountedSubtotal={discountedSubtotal}
            cgst={cgst}
            sgst={sgst}
            totalAmount={totalAmountWithGST}
            advance={advance}
            balanceDue={balanceDue}
            // We'll pass in the "patientDetails" or "customer details" combined
            customerDetails={
              hasMrNumber
                ? {
                    mr_number: mrNumber,
                    name: patientDetails?.name,
                    age: patientDetails?.age,
                    phoneNumber: patientDetails?.phoneNumber,
                    gender: patientDetails?.gender,
                    address: patientDetails?.address,
                  }
                : {
                    name: customerName,
                    phoneNumber: customerPhone,
                    address: customerAddress,
                    age: customerAge,
                    gender: customerGender,
                  }
            }
          />
        </div>
      </div>
    );
  };
  
  export default Insurance_checkout;
  