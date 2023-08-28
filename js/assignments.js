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
 * @param {string} assignment_id - The ID of the assignment.
 * @param {string} [section] - The relevant section if known. Otherwise retrieve it (expensive).
 * @returns {Promise<object>} The assignment object.
 */
async function getAssignment(assignment_id, section) {
  if (section) {
    return await fetchApiJson(`sections/${section.id}/assignments/${assignment_id}`);
  }
  if (!section)  {
    return await getCorrespondingSection(assignment_id)
      .then((section) => {
        return fetchApiJson(`sections/${section.id}/assignments/${assignment_id}`)
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
 * @param {string} assignment_id - ID of the assignment to find the section for.
 * @returns {Promise<object>} The section containing the specified assignment.
 */
async function getCorrespondingSection (assignment_id){
  const allSections = (await fetchApiJson(`users/${getUserId()}/sections`)).section;

  for (const curSection of allSections){
    // TODO: this is a really scuffed way to get all assignments that belong to a section, but it works
    const curSectionAssignments = (await fetchApiJson(`sections/${curSection.id}/assignments/?start=0&limit=999`)).assignment;
    if (!curSectionAssignments) continue;

    for (const assignment of curSectionAssignments) {
      if (assignment.id === assignment_id){
        return curSection;
      }
    }
  }
} 

/**
 * Checks if a given assignment ID exists within a specified grading period.
 * @param {object} grading_period - The grading period object to search within.
 * @param {string} assignment_id - The ID of the assignment to look for.
 * @returns {boolean} - True if the assignment exists in the grading period, otherwise false.
 */
function gradingPeriodContainsAssignment (grading_period, assignment_id){
  return grading_period.assignment.find((A) => A.assignment_id == assignment_id) !== undefined;
}

async function getGradingCategoryName (sectionID, gradingCategoryID){
  const allSectionGrades = (await fetchApiJson(`users/${getUserId()}/grades`)).section;
  const allRelevantGradingCategories = allSectionGrades.find((sec) => sec.section_id == sectionID).grading_category;
  
  return allRelevantGradingCategories.find((cat) => cat.id == gradingCategoryID).title;
}

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
  
// TODO: change var back to const
async function displayAssignmentStatistics() {
  url = window.location.href;
  assignment_id = parseInt(url.match(/(\d+)/g)[0]);

  curSection = (await getCorrespondingSection(assignment_id));
  curAssignment = (await getAssignment(assignment_id, curSection));

  assignmentStats = {
    points: parseInt(curAssignment.max_points),
    gradingCategory: await getGradingCategoryName(curSection.id, curAssignment.grading_category),
  };


  const parentElement = document.querySelector("#right-column-inner div.right-block-big-wrapper")
  parentElement?.appendChild(createStatsElement(assignmentStats));
}

(async () => {
  await displayAssignmentStatistics();
})();

Logger.debug("Finished loading assignments.js");
