/**
 * @param {object} router
 */
export function registerAppJsRoutes(router) {
  router.get("/app.js", async (request2, env2) => {
    const js = `// Weyland Application JavaScript
  // This file is served separately to avoid HTML escaping issues

  console.log("=== APP.JS LOADED ===");

  // Immediate write to debug console
  (function() {
      var out = document.getElementById("consoleOutput");
      if (out) {
          out.innerHTML += "<div style='color: yellow'>[EXEC] app.js executing now! (" + new Date().toLocaleTimeString() + ")</div>";
      }
  })();

  // Check localStorage immediately
  var token = localStorage.getItem("weyland_token");
  (function() {
      var out = document.getElementById("consoleOutput");
      if (out) {
          if (token) {
              out.innerHTML += "<div style='color: green'>[TOKEN] Found: " + token.substring(0, 30) + "...</div>";
          } else {
              out.innerHTML += "<div style='color: red'>[TOKEN] NOT FOUND in localStorage</div>";
          }
      }
  })();

  var currentUser = null;

  // Window load event
  window.onload = function() {
      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: blue'>[EVENT] window.onload FIRED</div>";

      if (token) {
          console.log("Token found, verifying...");
          verifyToken();
      } else {
          console.log("No token found");
      }
  };

  // Verify token function
  function verifyToken() {
      console.log("verifyToken called");
      fetch("/api/auth/me", {
          headers: { "Authorization": "Bearer " + token }
      }).then(function(response) {
          console.log("Auth response:", response.status);
          if (!response.ok) { throw new Error("Invalid token"); }
          return response.json();
      }).then(function(data) {
          console.log("Token valid, user:", data.user);
          currentUser = data.user;
          document.getElementById("authModal").classList.add("hidden");
          document.getElementById("dashboard").classList.remove("hidden");
          document.getElementById("userName").textContent = currentUser.name || currentUser.email;
          loadSubmittals();
      }).catch(function(err) {
          console.log("Token verification failed:", err.message);
          localStorage.removeItem("weyland_token");
          token = null;
          document.getElementById("authModal").classList.remove("hidden");
          document.getElementById("dashboard").classList.add("hidden");
      });
  }

  function loadSubmittals() {
      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: cyan'>[LOAD] Loading submittals...</div>";

      fetch("/api/submittals", {
          headers: { "Authorization": "Bearer " + token }
      }).then(function(response) {
          if (!response.ok) throw new Error("Failed to load submittals");
          return response.json();
      }).then(function(data) {
          if (out) out.innerHTML += "<div style='color: green'>[LOAD] Loaded " + data.submittals.length + " submittals</div>";
          displaySubmittals(data.submittals);
      }).catch(function(err) {
          if (out) out.innerHTML += "<div style='color: red'>[LOAD] Error: " + err.message + "</div>";
      });
  }

  function displaySubmittals(submittals) {
      var list = document.getElementById("submittalsList");
      if (!list) return;

      if (!submittals || submittals.length === 0) {
          list.innerHTML = '<p class="text-slate-400 text-center py-8">No submittals yet</p>';
          return;
      }

      list.innerHTML = submittals.map(function(s) {
          var statusColor = s.status === 'completed' || s.status === 'review' ? 'green' : s.status === 'failed' ? 'red' : 'yellow';
          return '<div data-submittal-id="' + s.id + '" class="submittal-card bg-slate-900/50 p-4 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">' +
              '<div class="flex justify-between items-start mb-2">' +
              '<h4 class="font-semibold text-white">' + escapeHtml(s.project_name) + '</h4>' +
              '<span class="text-xs px-2 py-1 rounded bg-' + statusColor + '-900/50 text-' + statusColor + '-300">' + s.status.toUpperCase() + '</span>' +
              '</div>' +
              '<p class="text-sm text-slate-400">Uploaded: ' + new Date(s.created_at).toLocaleDateString() + '</p>' +
              '<p class="text-sm text-slate-400">Doors: ' + (s.door_count || 0) + '</p>' +
              '</div>';
      }).join('');

      // Add event delegation for clicks
      setupSubmittalCardListeners();
  }

  function setupSubmittalCardListeners() {
      var list = document.getElementById("submittalsList");
      if (!list) return;

      // Remove old listener if exists
      list.removeEventListener('click', handleSubmittalCardClick);

      // Add new listener using event delegation
      list.addEventListener('click', handleSubmittalCardClick);
  }

  function handleSubmittalCardClick(event) {
      // Find the closest submittal card
      var card = event.target.closest('.submittal-card');
      if (card) {
          var submittalId = card.getAttribute('data-submittal-id');
          if (submittalId) {
              var out = document.getElementById("consoleOutput");
              if (out) out.innerHTML += "<div style='color: cyan'>[CLICK] Submittal card clicked: " + submittalId + "</div>";
              viewSubmittal(submittalId);
          }
      }
  }

  function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }

  // Navigation handlers
  window.logout = function() {
      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: yellow'>[LOGOUT] Logging out...</div>";

      localStorage.removeItem("weyland_token");
      token = null;
      currentUser = null;

      document.getElementById("dashboard").classList.add("hidden");
      document.getElementById("authModal").classList.remove("hidden");

      if (out) out.innerHTML += "<div style='color: green'>[LOGOUT] Logged out successfully</div>";
  };

  window.showSubmittalExpress = function() {
      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: cyan'>[NAV] Redirecting to SubmittalExpress (Hardware Schedule UI)...</div>";

      // Redirect to new hardware-focused UI
      // Token available via shared localStorage (same authentication system)
      window.location.href = "https://alpha.submittalexpress.pages.dev";
  };

  window.hideSubmittalExpress = window.showDashboard = function() {
      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: cyan'>[NAV] Showing Dashboard view...</div>";

      document.getElementById("submittalExpressView").classList.add("hidden");
      document.getElementById("dashboardView").classList.remove("hidden");
      localStorage.setItem("weyland_current_view", "dashboard");
  };

  // window.handleLogin REMOVED (WO-2026-0611-HASCOM-001 Phase A): orphaned password
  // login posting to /api/auth/login \u2014 a route removed in Jan (see AUTH section note).
  // No HTML in this bundle invoked it. Fleet magic-link at / is the login path.
  // Archived in git: 0c74900 weyland-worker.js L15382-15421.

  // File upload handler
  window.handleUpload = function(event) {
      event.preventDefault();

      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: cyan'>[UPLOAD] Starting upload...</div>";

      var projectName = document.getElementById("projectName").value.trim();
      var fileInput = document.getElementById("fileInput");
      var files = fileInput.files;

      // Check if folder input was used instead
      var folderInput = document.getElementById("folderInput");
      if (folderInput.files && folderInput.files.length > 0) {
          files = folderInput.files;
      }

      if (!files || files.length === 0) {
          showError("Please select at least one file");
          if (out) out.innerHTML += "<div style='color: red'>[UPLOAD] No files selected</div>";
          return;
      }

      if (!projectName) {
          showError("Please enter a project name");
          if (out) out.innerHTML += "<div style='color: red'>[UPLOAD] No project name entered</div>";
          return;
      }

      // Validate files
      var maxSize = 50 * 1024 * 1024; // 50MB
      var validFiles = [];
      var errors = [];

      for (var i = 0; i < files.length; i++) {
          var file = files[i];

          // Check file type
          if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
              errors.push(file.name + " - Only PDF files supported");
              continue;
          }

          // Check file size
          if (file.size > maxSize) {
              errors.push(file.name + " - File too large (max 50MB)");
              continue;
          }

          validFiles.push(file);
      }

      if (errors.length > 0) {
          showError("File validation errors:\\n" + errors.join("\\n"));
          if (out) out.innerHTML += "<div style='color: orange'>[UPLOAD] Validation errors: " + errors.length + "</div>";
      }

      if (validFiles.length === 0) {
          showError("No valid files to upload");
          if (out) out.innerHTML += "<div style='color: red'>[UPLOAD] No valid files</div>";
          return;
      }

      if (out) out.innerHTML += "<div style='color: green'>[UPLOAD] Validated " + validFiles.length + " files</div>";

      // Create FormData
      var formData = new FormData();
      formData.append("projectName", projectName);

      for (var j = 0; j < validFiles.length; j++) {
          formData.append("file", validFiles[j]);
      }

      // Show loading state
      var submitBtn = document.querySelector("#uploadForm button[type=submit]");
      var uploadText = document.getElementById("uploadText");
      var uploadSpinner = document.getElementById("uploadSpinner");

      if (submitBtn) submitBtn.disabled = true;
      if (uploadText) uploadText.textContent = "Uploading...";
      if (uploadSpinner) uploadSpinner.classList.remove("hidden");

      hideError();

      if (out) out.innerHTML += "<div style='color: cyan'>[UPLOAD] Sending to /api/submittals/upload...</div>";

      // Upload files
      fetch("/api/submittals/upload", {
          method: "POST",
          headers: {
              "Authorization": "Bearer " + token
          },
          body: formData
      }).then(function(response) {
          if (out) out.innerHTML += "<div style='color: " + (response.ok ? "green" : "red") + "'>[UPLOAD] Response: " + response.status + "</div>";
          return response.json();
      }).then(function(data) {
          if (data.results) {
              if (out) out.innerHTML += "<div style='color: green'>[UPLOAD] Upload complete! " + data.results.length + " results</div>";
              displayUploadResults(data.results);

              // Clear form
              document.getElementById("uploadForm").reset();
              document.getElementById("selectedFiles").textContent = "";

              // Reload submittals
              loadSubmittals();
          } else if (data.error) {
              showError(data.error);
              if (out) out.innerHTML += "<div style='color: red'>[UPLOAD] Error: " + data.error + "</div>";
          }
      }).catch(function(err) {
          showError("Upload failed: " + err.message);
          if (out) out.innerHTML += "<div style='color: red'>[UPLOAD] Network error: " + err.message + "</div>";
      }).finally(function() {
          // Reset button state
          if (submitBtn) submitBtn.disabled = false;
          if (uploadText) uploadText.textContent = "Upload & Process";
          if (uploadSpinner) uploadSpinner.classList.add("hidden");
      });
  };

  function showError(message) {
      var errorDiv = document.getElementById("uploadError");
      if (errorDiv) {
          errorDiv.textContent = message;
          errorDiv.classList.remove("hidden");
      }
  }

  function hideError() {
      var errorDiv = document.getElementById("uploadError");
      if (errorDiv) {
          errorDiv.classList.add("hidden");
      }
  }

  function displayUploadResults(results) {
      var resultsDiv = document.getElementById("uploadResults");
      if (!resultsDiv) return;

      resultsDiv.innerHTML = results.map(function(r) {
          var statusColor = r.status === 'success' ? 'green' : r.status === 'error' ? 'red' : 'yellow';
          var icon = r.status === 'success' ? '\u2713' : r.status === 'error' ? '\u2717' : '\u26A0';

          return '<div class="p-3 bg-' + statusColor + '-900/30 text-' + statusColor + '-200 rounded text-sm">' +
              icon + ' ' + escapeHtml(r.filename) +
              (r.error ? ' - ' + escapeHtml(r.error) : ' - Processing started') +
              '</div>';
      }).join('');

      resultsDiv.classList.remove("hidden");
  }

  // Folder selection handler
  window.selectFolder = function() {
      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: cyan'>[FOLDER] Opening folder selector...</div>";

      var folderInput = document.getElementById("folderInput");
      if (folderInput) {
          folderInput.click();

          folderInput.onchange = function() {
              var files = folderInput.files;
              var pdfCount = 0;

              for (var i = 0; i < files.length; i++) {
                  if (files[i].name.toLowerCase().endsWith('.pdf')) {
                      pdfCount++;
                  }
              }

              var selectedFilesDiv = document.getElementById("selectedFiles");
              if (selectedFilesDiv) {
                  selectedFilesDiv.textContent = "Selected " + pdfCount + " PDF files from folder";
              }

              if (out) out.innerHTML += "<div style='color: green'>[FOLDER] Selected " + pdfCount + " PDFs from " + files.length + " total files</div>";
          };
      }
  };

  // Password toggle handler
  window.togglePassword = function() {
      var passwordInput = document.getElementById("authPassword");
      var toggleBtn = document.getElementById("togglePassword");

      if (passwordInput && toggleBtn) {
          if (passwordInput.type === "password") {
              passwordInput.type = "text";
              toggleBtn.textContent = "\u{1F441}\uFE0F";
          } else {
              passwordInput.type = "password";
              toggleBtn.textContent = "\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F";
          }
      }
  };

  // View submittal detail
  window.viewSubmittal = function(submittalId) {
      var out = document.getElementById("consoleOutput");
      if (out) out.innerHTML += "<div style='color: cyan'>[VIEW] Loading submittal " + submittalId + "...</div>";

      fetch("/api/submittals/" + submittalId, {
          headers: { "Authorization": "Bearer " + token }
      }).then(function(response) {
          if (!response.ok) throw new Error("Failed to load submittal");
          return response.json();
      }).then(function(data) {
          if (out) out.innerHTML += "<div style='color: green'>[VIEW] Loaded submittal with " + (data.submittal.doors ? data.submittal.doors.length : 0) + " doors</div>";
          showSubmittalDetail(data.submittal);
      }).catch(function(err) {
          if (out) out.innerHTML += "<div style='color: red'>[VIEW] Error: " + err.message + "</div>";
      });
  };

  function showSubmittalDetail(submittal) {
      // Hide submittal list, show detail view
      document.getElementById("submittalsList").classList.add("hidden");
      document.getElementById("submittalUploadForm").classList.add("hidden");

      var detailView = document.getElementById("submittalDetailView");
      if (!detailView) {
          // Create detail view if it doesn't exist
          var container = document.getElementById("submittalExpressView");
          var detailHTML = '<div id="submittalDetailView" class="hidden"></div>';
          container.insertAdjacentHTML('beforeend', detailHTML);
          detailView = document.getElementById("submittalDetailView");
      }

      detailView.classList.remove("hidden");

      // Render detail view
      var statusColor = submittal.status === 'completed' || submittal.status === 'review' ? 'green' : submittal.status === 'failed' ? 'red' : 'yellow';

      var html = '<button onclick="hideSubmittalDetail()" class="mb-4 text-blue-400 hover:text-blue-300 flex items-center">' +
          '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>' +
          'Back to Submittals' +
          '</button>' +
          '<div class="bg-slate-800/50 backdrop-blur rounded-xl p-8 mb-6">' +
          '<div class="flex justify-between items-start mb-6">' +
          '<div>' +
          '<h2 class="text-3xl font-bold text-white mb-2">' + escapeHtml(submittal.project_name) + '</h2>' +
          '<p class="text-slate-400">Uploaded: ' + new Date(submittal.created_at).toLocaleDateString() + '</p>' +
          '</div>' +
          '<span class="text-sm px-3 py-1 rounded bg-' + statusColor + '-900/50 text-' + statusColor + '-300 font-semibold">' + submittal.status.toUpperCase() + '</span>' +
          '</div>' +
          '<div class="grid grid-cols-3 gap-4 mb-6">' +
          '<div class="bg-slate-900/50 p-4 rounded-lg">' +
          '<p class="text-slate-400 text-sm">Total Doors</p>' +
          '<p class="text-2xl font-bold text-white">' + (submittal.doors ? submittal.doors.length : 0) + '</p>' +
          '</div>' +
          '<div class="bg-slate-900/50 p-4 rounded-lg">' +
          '<p class="text-slate-400 text-sm">Status</p>' +
          '<p class="text-xl font-semibold text-white capitalize">' + submittal.status + '</p>' +
          '</div>' +
          '<div class="bg-slate-900/50 p-4 rounded-lg">' +
          '<p class="text-slate-400 text-sm">Progress</p>' +
          '<p class="text-2xl font-bold text-white">' + (submittal.progress || 0) + '%</p>' +
          '</div>' +
          '</div>' +
          '</div>';

      // Add doors section
      if (submittal.doors && submittal.doors.length > 0) {
          html += '<div class="bg-slate-800/50 backdrop-blur rounded-xl p-8">' +
              '<div class="flex justify-between items-center mb-6">' +
              '<h3 class="text-xl font-bold text-white">Extracted Doors (' + submittal.doors.length + ')</h3>' +
              '<div class="flex gap-2">' +
              '<button onclick="switchViewMode(\\'table\\')" id="tableViewBtn" class="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded bg-slate-900">Table View</button>' +
              '<button onclick="switchViewMode(\\'cards\\')" id="cardsViewBtn" class="text-slate-400 hover:text-slate-300 text-sm px-3 py-1 rounded">Card View</button>' +
              '<button onclick="toggleAllDoors()" class="text-blue-400 hover:text-blue-300 text-sm">Expand All</button>' +
              '</div>' +
              '</div>' +
              '<div id="tableViewContainer" class="overflow-x-auto">' +
              '<table class="w-full text-sm text-left">' +
              '<thead class="text-xs uppercase bg-slate-900 text-slate-400">' +
              '<tr>' +
              '<th class="px-3 py-2">Mark</th>' +
              '<th class="px-3 py-2">Size</th>' +
              '<th class="px-3 py-2">W&quot;</th>' +
              '<th class="px-3 py-2">H&quot;</th>' +
              '<th class="px-3 py-2">Type</th>' +
              '<th class="px-3 py-2">Material</th>' +
              '<th class="px-3 py-2">Frame</th>' +
              '<th class="px-3 py-2">Glazing</th>' +
              '<th class="px-3 py-2">HW</th>' +
              '<th class="px-3 py-2">FR</th>' +
              '<th class="px-3 py-2">Thick</th>' +
              '<th class="px-3 py-2">Notes</th>' +
              '</tr>' +
              '</thead>' +
              '<tbody>' +
              submittal.doors.map(function(door, index) {
                  var notesRefs = '';
                  if (door.door_notes_refs && door.door_notes_refs.length > 0) {
                      notesRefs = door.door_notes_refs.join(', ');
                  }
                  if (door.glazing_notes_refs && door.glazing_notes_refs.length > 0) {
                      notesRefs += (notesRefs ? ' | GLZ: ' : 'GLZ: ') + door.glazing_notes_refs.join(', ');
                  }
                  return '<tr class="border-b border-slate-700 hover:bg-slate-800/50">' +
                      '<td class="px-3 py-2 font-bold text-white">' + escapeHtml(door.door_number || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + escapeHtml(door.size || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + (door.width_inches || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + (door.height_inches || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + escapeHtml(door.type || door.door_type || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + escapeHtml(door.material || door.material_code || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + escapeHtml(door.frame || door.frame_material || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + escapeHtml(door.glazing || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + escapeHtml(door.hardware || door.hardware_group || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + escapeHtml(door.fire_rating || '-') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300">' + (door.thickness_inches || 'N/A') + '</td>' +
                      '<td class="px-3 py-2 text-slate-300 text-xs">' + escapeHtml(notesRefs || '-') + '</td>' +
                      '</tr>';
              }).join('') +
              '</tbody>' +
              '</table>' +
              '</div>' +
              '<div id="cardsViewContainer" class="space-y-4 hidden">' +
              submittal.doors.map(function(door, index) {
                  return '<div class="bg-slate-900/50 rounded-lg overflow-hidden">' +
                      '<div onclick="toggleDoor(' + index + ')" class="p-4 cursor-pointer hover:bg-slate-800/50 transition">' +
                      '<div class="flex justify-between items-center">' +
                      '<div class="grid grid-cols-6 gap-4 flex-1">' +
                      '<div><span class="text-xs text-slate-500">MARK</span><br><span class="font-bold text-white">' + escapeHtml(door.door_number || 'N/A') + '</span></div>' +
                      '<div><span class="text-xs text-slate-500">SIZE</span><br><span class="text-slate-300">' + escapeHtml(door.size || (door.width_inches && door.height_inches ? door.width_inches + 'x' + door.height_inches : 'N/A')) + '</span></div>' +
                      '<div><span class="text-xs text-slate-500">TYPE</span><br><span class="text-slate-300">' + escapeHtml(door.type || door.door_type || 'N/A') + '</span></div>' +
                      '<div><span class="text-xs text-slate-500">MATERIAL</span><br><span class="text-slate-300">' + escapeHtml(door.material || door.material_code || 'N/A') + '</span></div>' +
                      '<div><span class="text-xs text-slate-500">FRAME</span><br><span class="text-slate-300">' + escapeHtml(door.frame || door.frame_material || 'N/A') + '</span></div>' +
                      '<div><span class="text-xs text-slate-500">HW</span><br><span class="text-slate-300">' + escapeHtml(door.hardware || door.hardware_group || 'N/A') + '</span></div>' +
                      '</div>' +
                      '<svg id="doorIcon' + index + '" class="w-5 h-5 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>' +
                      '</svg>' +
                      '</div>' +
                      '</div>' +
                      '<div id="doorDetails' + index + '" class="hidden p-4 border-t border-slate-700">' +
                      '<div class="grid grid-cols-4 gap-4">' +
                      '<div><span class="text-slate-400 text-xs">Width:</span><br><span class="text-white">' + (door.width_inches || 'N/A') + '&quot;</span></div>' +
                      '<div><span class="text-slate-400 text-xs">Height:</span><br><span class="text-white">' + (door.height_inches || 'N/A') + '&quot;</span></div>' +
                      '<div><span class="text-slate-400 text-xs">Thickness:</span><br><span class="text-white">' + (door.thickness_inches || 'N/A') + '&quot;</span></div>' +
                      '<div><span class="text-slate-400 text-xs">Fire Rating:</span><br><span class="text-white">' + escapeHtml(door.fire_rating || 'None') + '</span></div>' +
                      '<div><span class="text-slate-400 text-xs">Glazing:</span><br><span class="text-white">' + escapeHtml(door.glazing || 'N/A') + '</span></div>' +
                      '<div><span class="text-slate-400 text-xs">Door Notes:</span><br><span class="text-white">' + (door.door_notes_refs ? escapeHtml(door.door_notes_refs.join(', ')) : 'None') + '</span></div>' +
                      '<div><span class="text-slate-400 text-xs">Glazing Notes:</span><br><span class="text-white">' + (door.glazing_notes_refs ? escapeHtml(door.glazing_notes_refs.join(', ')) : 'None') + '</span></div>' +
                      '</div>' +
                      (door.remarks ? '<div class="mt-4"><span class="text-slate-400 text-xs">Remarks:</span><br><span class="text-white text-sm">' + escapeHtml(door.remarks) + '</span></div>' : '') +
                      '</div>' +
                      '</div>';
              }).join('') +
              '</div>' +
              '</div>';
      } else {
          html += '<div class="bg-slate-800/50 backdrop-blur rounded-xl p-8 text-center">' +
              '<p class="text-slate-400">No doors extracted yet</p>' +
              '</div>';
      }

      detailView.innerHTML = html;
  }

  window.hideSubmittalDetail = function() {
      document.getElementById("submittalDetailView").classList.add("hidden");
      document.getElementById("submittalsList").classList.remove("hidden");
      document.getElementById("submittalUploadForm").classList.remove("hidden");
  };

  window.toggleDoor = function(index) {
      var details = document.getElementById("doorDetails" + index);
      var icon = document.getElementById("doorIcon" + index);

      if (details.classList.contains("hidden")) {
          details.classList.remove("hidden");
          icon.style.transform = "rotate(180deg)";
      } else {
          details.classList.add("hidden");
          icon.style.transform = "rotate(0deg)";
      }
  };

  window.toggleAllDoors = function() {
      var allHidden = true;
      var details = document.querySelectorAll('[id^="doorDetails"]');

      for (var i = 0; i < details.length; i++) {
          if (!details[i].classList.contains("hidden")) {
              allHidden = false;
              break;
          }
      }

      for (var j = 0; j < details.length; j++) {
          var icon = document.getElementById("doorIcon" + j);
          if (allHidden) {
              details[j].classList.remove("hidden");
              if (icon) icon.style.transform = "rotate(180deg)";
          } else {
              details[j].classList.add("hidden");
              if (icon) icon.style.transform = "rotate(0deg)";
          }
      }
  };

  window.switchViewMode = function(mode) {
      var tableView = document.getElementById("tableViewContainer");
      var cardsView = document.getElementById("cardsViewContainer");
      var tableBtn = document.getElementById("tableViewBtn");
      var cardsBtn = document.getElementById("cardsViewBtn");

      if (mode === 'table') {
          tableView.classList.remove("hidden");
          cardsView.classList.add("hidden");
          tableBtn.classList.add("bg-slate-900", "text-blue-400");
          tableBtn.classList.remove("text-slate-400");
          cardsBtn.classList.remove("bg-slate-900", "text-blue-400");
          cardsBtn.classList.add("text-slate-400");
      } else {
          tableView.classList.add("hidden");
          cardsView.classList.remove("hidden");
          cardsBtn.classList.add("bg-slate-900", "text-blue-400");
          cardsBtn.classList.remove("text-slate-400");
          tableBtn.classList.remove("bg-slate-900", "text-blue-400");
          tableBtn.classList.add("text-slate-400");
      }
  };

  console.log("=== APP.JS FULLY LOADED ===");
  `;
    return new Response(js, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  });
}
