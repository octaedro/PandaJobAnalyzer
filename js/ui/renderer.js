/**
 * UI Renderer
 * Handles rendering results to the UI
 */

/**
 * UI Renderer Service
 */
class UIRendererService {
  /**
   * Initialize UI elements
   * @param {Object} elements - DOM elements
   */
  init(elements) {
    this.elements = elements;
  }

  /**
   * Display job analysis results in the UI
   * @param {Object} results - The analysis results
   */
  displayResults(results) {
    if (!this.elements) {
      throw new Error("UI Renderer not initialized. Call init() first.");
    }

    // Job Location
    this.elements.jobLocationEl.textContent = Array.isArray(results.jobLocation)
      ? results.jobLocation.join(", ")
      : results.jobLocation || "Not specified";

    // Required Skills
    this.renderSkillsList(
      this.elements.requiredSkillsEl,
      results.requiredSkills
    );

    // Nice to Have Skills
    this.renderSkillsList(this.elements.niceToHaveEl, results.niceToHaveSkills);

    // Company Summary
    this.elements.companySummaryEl.textContent =
      results.companySummary || "No company information available";

    // Company Reviews
    this.elements.companyReviewsEl.textContent =
      results.companyReviews || "No reviews available";

    // Salary Range
    this.renderSalaryRange(results.salaryRange);
  }

  /**
   * Render skills list
   * @param {HTMLElement} element - The element to render to
   * @param {Array} skills - The skills to render
   */
  renderSkillsList(element, skills) {
    element.innerHTML = "";
    if (Array.isArray(skills) && skills.length > 0) {
      skills.forEach((skill) => {
        const li = document.createElement("li");
        li.textContent = skill;
        element.appendChild(li);
      });
    } else {
      element.innerHTML = "<li>No specific skills mentioned</li>";
    }
  }

  /**
   * Render salary range
   * @param {Object} salaryRange - The salary range to render
   */
  renderSalaryRange(salaryRange) {
    if (salaryRange && (salaryRange.min || salaryRange.max)) {
      let salaryText = "";

      // Extraer valores de texto, manejar el caso cuando min o max son objetos
      const minValue = this.extractSalaryValue(salaryRange.min);
      const maxValue = this.extractSalaryValue(salaryRange.max);

      if (minValue && maxValue) {
        salaryText = `${minValue} - ${maxValue}`;
      } else if (minValue) {
        salaryText = `From ${minValue}`;
      } else if (maxValue) {
        salaryText = `Up to ${maxValue}`;
      }

      this.elements.salaryRangeEl.textContent = salaryText;
    } else {
      this.elements.salaryRangeEl.textContent = "Not specified in the listing";
    }
  }

  /**
   * Extract salary value as text, handling various formats
   * @param {any} value - The salary value which could be a string, number, or object
   * @returns {string} The extracted value as a string
   */
  extractSalaryValue(value) {
    if (!value) return null;

    // Si ya es un string o número, convertirlo a string
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    // Si es un objeto, intentar extraer información útil
    if (typeof value === "object") {
      // Verificar propiedades comunes en objetos de salario
      if (value.amount) return String(value.amount);
      if (value.value) return String(value.value);
      if (value.salary) return String(value.salary);

      // Intentar extraer la primera propiedad si existe
      const firstProp = Object.values(value)[0];
      if (
        firstProp &&
        (typeof firstProp === "string" || typeof firstProp === "number")
      ) {
        return String(firstProp);
      }

      // Si todo falla, convertir a JSON para inspección
      try {
        return JSON.stringify(value);
      } catch (e) {
        return "Unknown format";
      }
    }

    return "Unknown format";
  }

  /**
   * Toggle loading state UI
   * @param {boolean} isLoading - Whether loading is in progress
   * @param {boolean} showResults - Whether to show results when done loading
   */
  toggleLoadingState(isLoading, showResults = false) {
    if (isLoading) {
      this.elements.loadingSpinner.classList.remove("hidden");
      this.elements.parseJobBtn.classList.add("hidden");
      this.elements.resultsSection.classList.add("hidden");
    } else {
      this.elements.loadingSpinner.classList.add("hidden");

      if (showResults) {
        this.elements.resultsSection.classList.remove("hidden");
      } else {
        this.elements.parseJobBtn.classList.remove("hidden");
      }
    }
  }

  /**
   * Show error message
   * @param {string} message - The error message to show
   */
  showError(message) {
    alert(message);
  }
}

// Export service
export default new UIRendererService();
