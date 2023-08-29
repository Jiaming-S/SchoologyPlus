(async function () {
  // Wait for loader.js to finish running
  while (!window.splusLoaded) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await loadDependencies("assignments", ["all"]);
})();

/**
 * Extracts the assignment ID from the current URL.
 * @returns {Promise<number>} - The extracted assignment ID.
 * @pre User is on assignment page (obviously).
 */
function extractAssignmentID(){
  const url = window.location.href;
  return parseInt(url.match(/(\d+)/g)[0]);
}

/**
 * Retrieves an assignment object using its ID, optionally specifying the associated section.
 * @param {string} assignmentID - The ID of the assignment.
 * @param {string} [section] - The relevant section if known. Otherwise retrieve it (expensive).
 * @returns {Promise<object>} The assignment object.
 */
async function getAssignment(assignmentID, section) {
  if (section) {
    return await fetchApiJson(`sections/${section.id}/assignments/${assignmentID}`);
  }
  if (!section)  {
    return await getCorrespondingSection(assignmentID)
      .then((section) => {
        return fetchApiJson(`sections/${section.id}/assignments/${assignmentID}`)
      })
      .then((assignment) => { 
        return assignment;
      })
      .catch((error) => {
        console.error("Something broke:", error);
      });
  }
}

/**
 * Finds the section containing an assignment with the given ID across all sections.
 * @param {string} assignmentID - ID of the assignment to find the section for.
 * @returns {Promise<object>} The section containing the specified assignment.
 */
async function getCorrespondingSection (assignmentID){
  const allSections = (await fetchApiJson(`users/${getUserId()}/sections`)).section;

  for (const curSection of allSections){
    // TODO: this is a really scuffed way to get all assignments that belong to a section, but it works
    const curSectionAssignments = (await fetchApiJson(`sections/${curSection.id}/assignments/?start=0&limit=999`)).assignment;
    if (!curSectionAssignments) continue;

    for (const assignment of curSectionAssignments) {
      if (assignment.id === assignmentID){
        return curSection;
      }
    }
  }
} 

/**
 * Checks if a given assignment ID exists within a specified grading period.
 * @param {object} grading_period - The grading period object to search within.
 * @param {string} assignmentID - The ID of the assignment to look for.
 * @returns {boolean} - True if the assignment exists in the grading period, otherwise false.
 */
function gradingPeriodContainsAssignment (grading_period, assignmentID){
  return grading_period.assignment.find((A) => A.assignmentID == assignmentID) !== undefined;
}

/**
 * Retrieves the name of a grading category based on the given section and grading category IDs.
 * @param {string} sectionID - The ID of the section.
 * @param {string} gradingCategoryID - The ID of the grading category.
 * @returns {Promise<string>} - The name of the grading category.
 */
async function getGradingCategoryName (sectionID, gradingCategoryID){
  const relevantSection = await fetchApiJson(`users/${getUserId()}/grades/?section_id=${sectionID}`);
  const allRelevantGradingCategories = relevantSection.section[0].grading_category;
  
  return allRelevantGradingCategories.find((cat) => cat.id == gradingCategoryID).title;
}

/**
 * Creates a statistics element with assignment details using the provided properties.
 * @param {object} props - An object containing assignment properties.
 * @param {number} props.points - The points earned for the assignment.
 * @param {string} props.gradingCategory - The grading category of the assignment.
 * @returns {HTMLElement} - The created statistics element.
 */
function createStatsElement (props){
  const wrapper = document.createElement("div");
  wrapper.classList.add("splus-statistics-wrapper");

  const header = document.createElement("h3");
  header.classList.add("h3-med-flat");
  header.innerHTML = "Assignment Details";
  wrapper.appendChild(header);

  const content = document.createElement("div");
  content.classList.add("splus-statistics");  

  
  content.innerHTML += `<p>Points: ${props.points}</p>`;
  content.innerHTML += `<p>Grading Category: ${props.gradingCategory}</p>`;

  wrapper.appendChild(content);
  return wrapper;
}
  
async function displayAssignmentStatistics() {
  assignmentID = extractAssignmentID();

  curSection = (await getCorrespondingSection(assignmentID));
  curAssignment = (await getAssignment(assignmentID, curSection));

  assignmentStats = {
    points: parseInt(curAssignment.max_points),
    gradingCategory: await getGradingCategoryName(curSection.id, curAssignment.grading_category),
  };

  const parentElement = document.querySelector("#right-column-inner div.right-block-big-wrapper")
  parentElement?.appendChild(createStatsElement(assignmentStats));
}

(async () => {
  try {
    await displayAssignmentStatistics();
  } catch (error) {
    console.log("Error occurred in assignments.js:", error);
  }
})();

Logger.debug("Finished loading assignments.js");
