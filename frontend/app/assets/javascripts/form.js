//= require update_monitor
//= require login

// Add session active check upon form submission
$(function() {
  var initSessionCheck = function() {
    $(this).each(function() {
      var $form = $(this);

      var checkForSession = function(event) {
        $.ajax({
          url: APP_PATH + "has_session",
          async: false,
          data_type: "json",
          success: function(json) {
            if (json.has_session) {
              return true;
            } else {
              event.preventDefault();
              event.stopImmediatePropagation();

              $(":input[type='submit']", $form).removeAttr("disabled");
              var $modal = AS.openAjaxModal(APP_PATH + "login");
              var $loginForm = $("form", $modal);
              AS.LoginHelper.init($loginForm);
              $loginForm.on("loginsuccess.aspace", function(event, data) {
                // update all CSRF input fields on the page
                $(":input[name=authenticity_token]").val(data.csrf_token);

                // unbind the session check and resubmit the form
                $form.unbind("submit", checkForSession);
                $form.submit();

                // remove the modal, the job is done.
                $modal.remove();

                return false;
              });

              return false;
            }
          },
          error: function() {
            $(":input[type='submit']", $form).removeAttr("disabled");
            return true;
          }
        });
      };

      $form.on("submit", checkForSession);
    });
  };

  $(document).bind("loadedrecordform.aspace", function(event, $container) {
    $.proxy(initSessionCheck, $container.find("form.aspace-record-form:not(.public-form)").andSelf().filter("form.aspace-record-form:not(.public-form)"))();
  });

  $.proxy(initSessionCheck, $("form.aspace-record-form:not(.public-form)"))();
});


// add form change detection
$(function() {
  var ignoredKeycodes = [37,39,9];

  var initFormChangeDetection = function() {
    $(this).each(function() {
      var $this = $(this);

      if ($this.data("changedDetectionEnabled")) {
        return;
      }

      $this.data("form_changed", $this.data("form_changed") || false);
      $this.data("changedDetectionEnabled", true);


      var onFormElementChange = function(event) {
        if ($(event.target).parents("*[data-no-change-tracking='true']").length === 0) {
          $this.trigger("formchanged.aspace");
        }
      };
      $this.on("change keyup", ":input", function(event) {
        if ($(this).data("original_value") && ($(this).data("original_value") !== $(this).val())) {
          onFormElementChange(event);
        } else if ($.inArray(event.keyCode, ignoredKeycodes) === -1) {
          onFormElementChange(event);
        }
      });
      $this.on("focusin", ":input", function(event) {
        $(event.target).parents(".subrecord-form").addClass("focus");
      });
      $this.on("focusout", ":input", function(event) {
        $(event.target).parents(".subrecord-form").removeClass("focus");
      });
      $this.on("click", ":radio, :checkbox", onFormElementChange);


      $this.bind("formchanged.aspace", function(event) {
        $this.data("form_changed", true);
        $(".record-toolbar", $this).addClass("formchanged");
        $(".record-toolbar .btn-toolbar .btn", $this).addClass("disabled").attr("disabled","disabled");
      });

      $(".createPlusOneBtn", $this).on("click", function() {
        $this.data("createPlusOne", "true");
      });

      $this.bind("submit", function(event) {
        $this.data("form_changed", false);
        $(":input[type='submit'], :input.btn-primary", $this).attr("disabled","disabled");
        if ($(this).data("createPlusOne")) {
          var $input = $("<input>").attr("type", "hidden").attr("name", "plus_one").val("true");
          $($this).append($input);
        }

        return true;
      });

      $(".record-toolbar .revert-changes .btn", $this).click(function() {
        $this.data("form_changed", false);
        return true;
      });

      $(window).bind("beforeunload", function(event) {
        if ($this.data("form_changed") === true) {
          return 'Please note you have some unsaved changes.';
        }
      });

      if ($this.data("update-monitor")) {
        $(document).trigger("setupupdatemonitor.aspace", [$this]);
      } else if ($this.closest(".modal").length === 0) {
        // if form isn't opened via a modal, then clear the timeouts
        // and they will be reinitialised for that form (e.g. tree forms)
        $(document).trigger("clearupdatemonitorintervals.aspace", [$this]);
      }

    });
  };

  $(document).bind("loadedrecordform.aspace", function(event, $container) {
    $.proxy(initFormChangeDetection, $("form.aspace-record-form", $container))();
  });

  $.proxy(initFormChangeDetection, $("form.aspace-record-form"))();
});
