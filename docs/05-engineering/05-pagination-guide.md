# Hướng dẫn sử dụng Pagination & Sorting

Tài liệu này giải thích cách sử dụng cấu trúc phân trang chuẩn `PageResponse<T>` trong toàn bộ dự án TripWise.

## 1. Cấu trúc Response
Mọi API trả về danh sách phân trang đều phải sử dụng `PageResponse<T>` bọc trong `ApiResponse`.
Ví dụ:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 0,
    "size": 10,
    "totalElements": 25,
    "totalPages": 3,
    "content": [
      { "id": 1, "name": "Item 1" },
      { "id": 2, "name": "Item 2" }
    ]
  }
}
```

## 2. Cách triển khai ở Controller

Sử dụng `Pageable` của Spring Data làm tham số đầu vào cho Controller. Bằng cách này, Spring sẽ tự động map các query params như `?page=0&size=10&sort=createdAt,desc`.

```java
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import com.tripwise.common.api.ApiResponse;
import com.tripwise.common.api.PageResponse;

@RestController
public class ExampleController {

    private final ExampleService exampleService;

    public ExampleController(ExampleService exampleService) {
        this.exampleService = exampleService;
    }

    @GetMapping("/api/v1/examples")
    public ApiResponse<PageResponse<ExampleDto>> getExamples(Pageable pageable) {
        // Service trả về đối tượng org.springframework.data.domain.Page
        Page<ExampleDto> pageResult = exampleService.getExamples(pageable);
        
        // Sử dụng PageResponse.of() để convert sang chuẩn API chung
        return ApiResponse.success(PageResponse.of(pageResult));
    }
}
```

## 3. Cách triển khai ở Service

Service có thể trực tiếp truyền `Pageable` xuống Repository (mở rộng từ `JpaRepository` hoặc `PagingAndSortingRepository`).

```java
public Page<ExampleDto> getExamples(Pageable pageable) {
    return exampleRepository.findAll(pageable)
            .map(entity -> new ExampleDto(entity)); // Hoặc dùng MapStruct
}
```

## 4. Lưu ý
- **Tránh offset quá lớn:** Postgres có thể chậm nếu `page` quá lớn. Đối với các query phức tạp, cân nhắc dùng keyset pagination (cursor) thay vì offset. Tuy nhiên, `PageResponse` hiện tại chỉ thiết kế cho offset-based.
- **Giới hạn Max Size:** Nên định cấu hình `@PageableDefault(size = 20)` hoặc `spring.data.web.pageable.max-page-size` trong application.yml để tránh client request 10.000 records/page gây sập server.
