-- #####################################################################
-- ##                                                                 ##
-- ##           智慧表單系統 (Intelligent Form System)                  ##
-- ##           P1 - 後端基礎建設 DB Schema                            ##
-- ##           Designed by 主人                                       ##
-- ##                                                                 ##
-- #####################################################################

-- ## 1. 用戶表 (Users)
-- ## 存儲系統中的所有用戶，包含登入認證、角色和狀態等資訊。
-- #####################################################################
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    status ENUM('active', 'inactive', 'pending_verification') NOT NULL DEFAULT 'pending_verification',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- ## 2. 表單主表 (Forms)
-- ## 定義每一個表單的核心資訊，如標題、描述、狀態，並關聯到創建者。
-- #####################################################################
CREATE TABLE forms (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    creator_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_forms_creator
        FOREIGN KEY (creator_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ## 3. 表單欄位定義表 (FormFields)
-- ## 存儲每個表單的具體欄位定義，如類型、驗證規則等。
-- #####################################################################
CREATE TABLE form_fields (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    form_id BIGINT UNSIGNED NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_type ENUM('text', 'textarea', 'number', 'email', 'date', 'select', 'checkbox', 'radio') NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    default_value TEXT NULL,
    options JSON NULL, -- 用於存儲 select, radio, checkbox 等的選項
    order_index INT NOT NULL DEFAULT 0, -- 欄位顯示順序
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_form_fields_form
        FOREIGN KEY (form_id) REFERENCES forms(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ## 4. 表單提交記錄 (Submissions)
-- ## 每次用戶提交表單後，都會在這裡產生一條記錄。
-- #####################################################################
CREATE TABLE submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    form_id BIGINT UNSIGNED NOT NULL,
    submitter_id BIGINT UNSIGNED NULL, -- 匿名提交則為 NULL
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_submissions_form
        FOREIGN KEY (form_id) REFERENCES forms(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_submissions_submitter
        FOREIGN KEY (submitter_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- ## 5. 提交回應詳情 (SubmissionResponses)
-- ## 存儲每次提交中，每個欄位的具體回應值。
-- #####################################################################
CREATE TABLE submission_responses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    submission_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    response_value TEXT NULL, -- 欄位回應值
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_submission_responses_submission
        FOREIGN KEY (submission_id) REFERENCES submissions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_submission_responses_field
        FOREIGN KEY (field_id) REFERENCES form_fields(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ## 索引最佳化 (Optional, 但強烈建議)
-- #####################################################################
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_forms_creator_id ON forms(creator_id);
CREATE INDEX idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX idx_submissions_form_id ON submissions(form_id);
CREATE INDEX idx_submissions_submitter_id ON submissions(submitter_id);
CREATE INDEX idx_submission_responses_submission_id ON submission_responses(submission_id);
CREATE INDEX idx_submission_responses_field_id ON submission_responses(field_id);