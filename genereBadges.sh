#!/bin/bash


JS_REPORT="lintes_report.txt"
JS_SUMMARY=$(grep "problems (" "$JS_REPORT" || grep "problem (" "$JS_REPORT")
JS_ERRORS=$(echo "$JS_SUMMARY" | grep -Eo '\([0-9]+ error(s)?' | grep -Eo '[0-9]+')
NBWARN_JS=$(echo "$JS_SUMMARY" | grep -Eo ', [0-9]+ warning(s)?' | grep -Eo '[0-9]+')
# Si JS_ERRORS est vide, on le met à 0
if [[ -z "$JS_ERRORS" ]]; then
  JS_ERRORS=0
fi
# Si NBWARN_JS est vide, on le met à 0
if [[ -z "$NBWARN_JS" ]]; then
  NBWARN_JS=0
fi

TOTAL_ERRORS=$(JS_ERRORS)
TOTAL_WARN=$(NBWARN_JS)
color="green"
if [[ $TOTAL_ERRORS > 0 ]]
then 
  color="red"
  else if [[ $TOTAL_WARN > 0 ]]
  then 
    color="orange"
  fi
fi
anybadge -o -l "LINT" -v "$TOTAL_ERRORS $TOTAL_WARN" -c "$color" -f "lint.svg" 

# génération du badge de test
JEST_REPORT="jest_report.txt"
TEST_ERROR=$(grep -Eo 'Tests: +[0-9]+' "$JEST_REPORT" | sed -E 's/Tests: +([0-9]+) failed .*/\1/')

color="green"
if [[ $TEST_ERRORS -gt 0 ]]
then
  color="red"
fi
anybadge -o -l "TEST" -v "$TEST_ERRORS" -c "$color" -f "test.svg"