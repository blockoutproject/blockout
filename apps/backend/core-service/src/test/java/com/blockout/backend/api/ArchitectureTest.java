package com.blockout.backend.api;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
    packages = "com.blockout.backend",
    importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
  @ArchTest
  static final ArchRule MODULES_HAVE_NO_CYCLES =
      slices().matching("com.blockout.backend.(*)..").should().beFreeOfCycles();

  @ArchTest
  static final ArchRule BUSINESS_CODE_DOES_NOT_DEPEND_ON_TRANSPORT =
      noClasses()
          .that()
          .resideInAnyPackage("..application..", "..domain..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage(
              "com.blockout.backend.api..",
              "com.blockout.shared.model..",
              "org.springframework.http..",
              "org.springframework.web..",
              "jakarta.servlet..");

  @ArchTest
  static final ArchRule APPLICATION_CODE_DOES_NOT_DEPEND_ON_ADAPTERS =
      noClasses()
          .that()
          .resideInAnyPackage("..application..", "..domain..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("..infrastructure..", "..config..");

  @ArchTest
  static final ArchRule IDENTITY_INTERNALS_STAY_INSIDE_IDENTITY =
      classes()
          .that()
          .resideInAPackage("com.blockout.backend.identity..infrastructure..")
          .should()
          .onlyHaveDependentClassesThat()
          .resideInAnyPackage("com.blockout.backend.identity..");

  @ArchTest
  static final ArchRule JOB_INTERNALS_STAY_INSIDE_JOBS =
      classes()
          .that()
          .resideInAPackage("com.blockout.backend.jobs.infrastructure..")
          .should()
          .onlyHaveDependentClassesThat()
          .resideInAnyPackage("com.blockout.backend.jobs..");

  @ArchTest
  static final ArchRule DOMAIN_REMAINS_FRAMEWORK_FREE =
      noClasses()
          .that()
          .resideInAPackage("..domain..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage(
              "org.springframework..", "jakarta..", "tools.jackson..", "com.fasterxml.jackson..");
}
