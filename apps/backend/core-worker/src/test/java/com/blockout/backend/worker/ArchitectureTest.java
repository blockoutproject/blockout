package com.blockout.backend.worker;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
    packages = "com.blockout.backend.worker",
    importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
  @ArchTest
  static final ArchRule WORKER_USES_PUBLIC_MODULE_BOUNDARIES =
      noClasses()
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage(
              "com.blockout.backend.identity..infrastructure..",
              "com.blockout.backend.jobs.infrastructure..",
              "com.blockout.backend.api..",
              "com.blockout.shared.model..");

  @ArchTest
  static final ArchRule EXECUTION_DOES_NOT_DEPEND_ON_SCHEDULING =
      noClasses()
          .that()
          .resideInAPackage("..application..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("..infrastructure..", "..config..");
}
