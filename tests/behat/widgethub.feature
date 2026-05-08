@editor  @tiny @editor_tiny  @tiny_widgethub
Feature: Tiny widgethub
  Open the widgethub dialog in TinyMCE editor
  Background:
    Given the following "courses" exist:
        | shortname | fullname |
        | C1        | Course 1 |
    And the following "users" exist:
        | username | firstname | lastname | email                |
        | teacher1 | Teacher   | 1        | teacher1@example.com |
        | student1 | Student   | 1        | student1@example.com |
    And the following "course enrolments" exist:
        | user     | course | role           |
        | teacher1 | C1     | editingteacher |
        | student1 | C1     | student        |
    And the following "activities" exist:
        | activity | name      | intro     | introformat | course | contentformat | idnumber |
        | page     | PageName1 | PageDesc1 | 1           | C1     | 1             | 1        |
  @javascript @external
  Scenario: View the widgethub dialog searchs yields no widgets in TinyMCE editor as an admin
    Given I log in as "admin"
    And I set the window size to "1920"x"1080"
    When I am on the "PageName1" "page activity editing" page
    And I set the field "Page content" to "Hello tiny!"
    And I click on ".tox-mbtn:contains('Insert')" "css_element"
    And I wait "1" seconds
    And I click on ".tox-collection__item-label:contains('WidgetHub component')" "css_element"
    And I wait "2" seconds
    And I wait until "[role='dialog']" "css_element" exists
    And I should see "Select a widget"
    And I set the field "widgethub_search_textfield" to "unexistent widget"
    Then I should see "No widgets have been found for the search criteria" in the "Select a widget" "dialogue"
  @javascript @external
  Scenario: View the widgethub dialog searchs yields no widgets in TinyMCE editor as a teacher
    Given I log in as "teacher1"
    And I set the window size to "1920"x"1080"
    When I am on the "PageName1" "page activity editing" page
    And I set the field "Page content" to "Hello tiny!"
    And I click on ".tox-mbtn:contains('Insert')" "css_element"
    And I wait "1" seconds
    And I click on ".tox-collection__item-label:contains('WidgetHub component')" "css_element"
    And I wait "2" seconds
    And I wait until "[role='dialog']" "css_element" exists
    And I should see "Select a widget"
    And I set the field "widgethub_search_textfield" to "unexistent widget"
    Then I should see "No widgets have been found for the search criteria" in the "Select a widget" "dialogue"
